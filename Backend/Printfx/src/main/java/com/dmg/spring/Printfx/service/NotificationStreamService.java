package com.dmg.spring.Printfx.service;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * Keeps one live connection (Server-Sent Events) per open browser tab, and
 * pushes a "notification" event to a user the moment something is saved for them.
 * The browser then reloads its notification list.
 */
@Service
public class NotificationStreamService {

    // The browser reconnects automatically when this expires
    private static final long EMITTER_TIMEOUT_MS = 30L * 60 * 1000;

    // userId -> that user's open tabs
    private final Map<Integer, List<SseEmitter>> emitters = new ConcurrentHashMap<>();

    public SseEmitter subscribe(int userId) {
        SseEmitter emitter = new SseEmitter(EMITTER_TIMEOUT_MS);
        emitters.computeIfAbsent(userId, id -> new CopyOnWriteArrayList<>()).add(emitter);

        emitter.onCompletion(() -> removeEmitter(userId, emitter));
        emitter.onTimeout(emitter::complete);
        emitter.onError(e -> removeEmitter(userId, emitter));

        try {
            emitter.send(SseEmitter.event().name("connected").data("ok"));
        } catch (IOException e) {
            removeEmitter(userId, emitter);
        }
        return emitter;
    }

    /** Tells every open tab of this user to reload notifications. */
    public void notifyUser(int userId) {
        List<SseEmitter> list = emitters.get(userId);
        if (list == null) {
            return;
        }
        for (SseEmitter emitter : list) {
            try {
                emitter.send(SseEmitter.event().name("notification").data("refresh"));
            } catch (Exception e) {
                removeEmitter(userId, emitter);
            }
        }
    }

    /**
     * Same as notifyUser, but if we're inside a database transaction, waits until
     * it commits, so the browser never reloads before the new row is visible.
     */
    public void notifyUserAfterCommit(Integer userId) {
        if (userId == null) {
            return;
        }
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    notifyUser(userId);
                }
            });
        } else {
            notifyUser(userId);
        }
    }

    // Azure closes connections that stay silent for ~4 minutes; this keeps them open.
    @Scheduled(fixedRate = 25_000)
    public void heartbeat() {
        emitters.forEach((userId, list) -> {
            for (SseEmitter emitter : list) {
                try {
                    emitter.send(SseEmitter.event().comment("keep-alive"));
                } catch (Exception e) {
                    removeEmitter(userId, emitter);
                }
            }
        });
    }

    private void removeEmitter(int userId, SseEmitter emitter) {
        List<SseEmitter> list = emitters.get(userId);
        if (list != null) {
            list.remove(emitter);
            if (list.isEmpty()) {
                emitters.remove(userId, list);
            }
        }
    }
}