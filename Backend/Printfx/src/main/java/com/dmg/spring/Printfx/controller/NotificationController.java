package com.dmg.spring.Printfx.controller;

import com.dmg.spring.Printfx.model.Notification;
import com.dmg.spring.Printfx.model.Users;
import com.dmg.spring.Printfx.repository.UserRepository;
import com.dmg.spring.Printfx.service.NotificationService;
import com.dmg.spring.Printfx.service.NotificationStreamService;

import jakarta.servlet.http.HttpServletResponse;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;

// CORS is handled globally in SecurityConfig (app.cors.allowed-origins)
@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private NotificationStreamService notificationStreamService;

    @Autowired
    private UserRepository userRepository;

    @GetMapping
    public ResponseEntity<List<Notification>> getMyNotifications(Authentication authentication) {
        Users user = currentUser(authentication);
        return ResponseEntity.ok(notificationService.getNotificationsForUser(user.getId()));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<Notification> markRead(@PathVariable Long id, Authentication authentication) {
        Users user = currentUser(authentication);
        return ResponseEntity.ok(notificationService.markRead(id, user.getId()));
    }

    // Live connection: the browser keeps this open and gets an event the
    // moment a new notification is saved for this user.
    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(Authentication authentication, HttpServletResponse response) {
        Users user = currentUser(authentication);
        response.setHeader("Cache-Control", "no-cache");
        response.setHeader("X-Accel-Buffering", "no");
        return notificationStreamService.subscribe(user.getId());
    }

    // authentication.getName() is the email JwtAuthenticationFilter put in the
    // principal; it's stored in UserRepository's "username" column.
    private Users currentUser(Authentication authentication) {
        String email = authentication.getName();
        Users user = userRepository.findByUsername(email);
        if (user == null) {
            throw new RuntimeException("User not found: " + email);
        }
        return user;
    }
}