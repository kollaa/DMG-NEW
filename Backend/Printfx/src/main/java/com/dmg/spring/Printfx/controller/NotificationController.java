package com.dmg.spring.Printfx.controller;

import com.dmg.spring.Printfx.model.Notification;
import com.dmg.spring.Printfx.model.Users;
import com.dmg.spring.Printfx.repository.UserRepository;
import com.dmg.spring.Printfx.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
@CrossOrigin(origins = "http://localhost:4200")
public class NotificationController {

    @Autowired
    private NotificationService notificationService;

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

    // Same pattern as OrderController.currentUser() — authentication.getName()
    // is the email JwtAuthenticationFilter put in the principal, and
    // UserRepository's "username" column is actually where that's stored.
    private Users currentUser(Authentication authentication) {
        String email = authentication.getName();
        Users user = userRepository.findByUsername(email);
        if (user == null) {
            throw new RuntimeException("User not found: " + email);
        }
        return user;
    }
}