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
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
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

	// ── User management ─────────────────────────────────────────────
	// Roles shown in the app: "ADMIN" or "VIEWER" (VIEWER = the CUSTOMER role).

	private static final String EMAIL_PATTERN = "^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$";
	private static final int MIN_PASSWORD_LENGTH = 8;

	@GetMapping
	public ResponseEntity<?> allUsers(Authentication auth) {
		if (!isAdmin(auth)) {
			return forbidden();
		}
		List<Map<String, Object>> users = userService.findAllUsers().stream()
				.map(this::toManagedUser)
				.toList();
		return ResponseEntity.ok(users);
	}

	@PostMapping
	public ResponseEntity<?> createUser(@RequestBody Map<String, String> body, Authentication auth) {
		if (!isAdmin(auth)) {
			return forbidden();
		}
		String name = trim(body.get("name"));
		String email = trim(body.get("email")).toLowerCase();
		String password = body.get("password");
		String roleName = toRoleName(body.get("role"));

		if (name.isEmpty() || email.isEmpty() || password == null || password.isEmpty()) {
			return badRequest("Name, email and password are required.");
		}
		if (!email.matches(EMAIL_PATTERN)) {
			return badRequest("Please enter a valid email address.");
		}
		if (password.length() < MIN_PASSWORD_LENGTH) {
			return badRequest("Password must be at least " + MIN_PASSWORD_LENGTH + " characters.");
		}
		if (roleName == null) {
			return badRequest("Role must be ADMIN or VIEWER.");
		}
		if (userService.findByUsername(email) != null) {
			return ResponseEntity.status(HttpStatus.CONFLICT)
					.body(Map.of("error", "An account with this email already exists."));
		}

		Users created = userService.createUser(name, email, password, roleName);
		return ResponseEntity.status(HttpStatus.CREATED).body(toManagedUser(created));
	}

	@PutMapping("/{id}/role")
	public ResponseEntity<?> changeRole(@PathVariable int id, @RequestBody Map<String, String> body,
			Authentication auth) {
		if (!isAdmin(auth)) {
			return forbidden();
		}
		String roleName = toRoleName(body.get("role"));
		if (roleName == null) {
			return badRequest("Role must be ADMIN or VIEWER.");
		}

		Optional<Users> target = userService.findById(id);
		if (target.isEmpty()) {
			return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "User not found"));
		}

		boolean demoting = UserService.CUSTOMER_ROLE.equals(roleName) && userService.isAdmin(target.get());
		if (demoting && target.get().getUsername().equalsIgnoreCase(auth.getName())) {
			return badRequest("You can't remove your own admin access.");
		}
		if (demoting && userService.countAdmins() <= 1) {
			return badRequest("There must be at least one admin.");
		}

		Users updated = userService.changeRole(id, roleName).orElseThrow();
		return ResponseEntity.ok(toManagedUser(updated));
	}

	/** Admin sets a new password for any user (e.g. someone who is locked out). */
	@PutMapping("/{id}/password")
	public ResponseEntity<?> resetPassword(@PathVariable int id, @RequestBody Map<String, String> body,
			Authentication auth) {
		if (!isAdmin(auth)) {
			return forbidden();
		}
		String password = body.get("password");
		if (password == null || password.length() < MIN_PASSWORD_LENGTH) {
			return badRequest("Password must be at least " + MIN_PASSWORD_LENGTH + " characters.");
		}
		Optional<Users> target = userService.findById(id);
		if (target.isEmpty()) {
			return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "User not found"));
		}
		userService.updatePassword(target.get().getUsername(), password); // stored as a BCrypt hash
		return ResponseEntity.ok(Map.of("message", "Password updated"));
	}

	private Map<String, Object> toManagedUser(Users u) {
		Map<String, Object> m = new LinkedHashMap<>();
		m.put("id", u.getId());
		m.put("name", u.getFullName());
		m.put("email", u.getUsername());
		m.put("role", userService.isAdmin(u) ? "ADMIN" : "VIEWER");
		m.put("status", u.getStatus() == null ? "APPROVED" : u.getStatus().name());
		m.put("createdAt", u.getCreatedAt() == null ? null : u.getCreatedAt().toString());
		return m;
	}

	private static String toRoleName(String role) {
		if (role == null) {
			return null;
		}
		switch (role.trim().toUpperCase()) {
			case "ADMIN":
				return UserService.ADMIN_ROLE;
			case "VIEWER":
			case "CUSTOMER":
				return UserService.CUSTOMER_ROLE;
			default:
				return null;
		}
	}

	private static String trim(String value) {
		return value == null ? "" : value.trim();
	}

	private ResponseEntity<Map<String, String>> badRequest(String message) {
		return ResponseEntity.badRequest().body(Map.of("error", message));
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