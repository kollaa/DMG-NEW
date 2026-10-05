package com.dmg.spring.Printfx.controller;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.dmg.spring.Printfx.model.AccountStatus;
import com.dmg.spring.Printfx.model.Users;
import com.dmg.spring.Printfx.service.NotificationService;
import com.dmg.spring.Printfx.service.SignupEmailService;
import com.dmg.spring.Printfx.service.UserService;

/**
 * Admin-only endpoints for reviewing signups.
 * Requires a valid login token (SecurityConfig) AND the ADMIN role (checked here).
 */
@RestController
@RequestMapping("/api/admin/users")
public class AdminUserController {

	@Autowired
	private UserService userService;

	@Autowired
	private SignupEmailService signupEmailService;

	@Autowired
	private NotificationService notificationService;

	@GetMapping("/pending")
	public ResponseEntity<?> pendingUsers(Authentication auth) {
		if (!isAdmin(auth)) {
			return forbidden();
		}
		List<Map<String, Object>> pending = userService.findPendingUsers().stream()
				.map(this::toSummary)
				.toList();
		return ResponseEntity.ok(pending);
	}

	@PostMapping("/{id}/approve")
	public ResponseEntity<?> approve(@PathVariable int id, Authentication auth) {
		if (!isAdmin(auth)) {
			return forbidden();
		}
		Optional<Users> user = userService.updateStatus(id, AccountStatus.APPROVED);
		if (user.isEmpty()) {
			return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "User not found"));
		}
		notificationService.resolveSignupNotifications(id);
		signupEmailService.notifyUserApproved(user.get());
		return ResponseEntity.ok(Map.of("message", "User approved"));
	}

	@PostMapping("/{id}/reject")
	public ResponseEntity<?> reject(@PathVariable int id, Authentication auth) {
		if (!isAdmin(auth)) {
			return forbidden();
		}
		Optional<Users> user = userService.updateStatus(id, AccountStatus.REJECTED);
		if (user.isEmpty()) {
			return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "User not found"));
		}
		notificationService.resolveSignupNotifications(id);
		signupEmailService.notifyUserRejected(user.get());
		return ResponseEntity.ok(Map.of("message", "User rejected"));
	}

	private boolean isAdmin(Authentication auth) {
		return auth != null && auth.isAuthenticated() && userService.isAdmin(auth.getName());
	}

	private ResponseEntity<Map<String, String>> forbidden() {
		return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Admin access required"));
	}

	// Only safe fields go to the browser; never the password hash
	private Map<String, Object> toSummary(Users u) {
		Map<String, Object> m = new LinkedHashMap<>();
		m.put("id", u.getId());
		m.put("name", u.getFullName());
		m.put("email", u.getUsername());
		m.put("createdAt", u.getCreatedAt() == null ? null : u.getCreatedAt().toString());
		return m;
	}
}