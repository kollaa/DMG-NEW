package com.dmg.spring.Printfx.controller;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.dmg.spring.Printfx.authentication.JWTUtil;
import com.dmg.spring.Printfx.model.AccountStatus;
import com.dmg.spring.Printfx.model.Users;
import com.dmg.spring.Printfx.service.NotificationService;
import com.dmg.spring.Printfx.service.OTPService;
import com.dmg.spring.Printfx.service.SignupEmailService;
import com.dmg.spring.Printfx.service.UserService;

// CORS is handled globally in SecurityConfig (app.cors.allowed-origins)
@RestController
@RequestMapping("/api/customers")
public class CustomerController {

	private static final String EMAIL_PATTERN = "^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$";
	private static final int MIN_PASSWORD_LENGTH = 8;

	@Autowired
	private UserService userService;

	@Autowired
	private OTPService otpService;

	@Autowired
	private SignupEmailService signupEmailService;

	@Autowired
	private NotificationService notificationService;

	@PostMapping("/login")
	public ResponseEntity<Map<String, String>> login(@RequestBody Users loginRequest) {
		Map<String, String> response = new HashMap<>();

		Optional<Users> result = userService.authenticate(loginRequest.getUsername(), loginRequest.getPassword());

		if (result.isEmpty()) {
			response.put("error", "Invalid email or password");
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
		}

		Users user = result.get();

		// Password was correct; now check whether the account may log in
		if (user.getStatus() == AccountStatus.PENDING) {
			response.put("error", "Your account is awaiting admin approval. You'll get an email once it's approved.");
			return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
		}
		if (user.getStatus() == AccountStatus.REJECTED) {
			response.put("error", "Your signup request was not approved. Please contact the marketing team.");
			return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
		}

		boolean rememberMe = Boolean.TRUE.equals(loginRequest.isRememberMe());
		String token = JWTUtil.generateToken(user.getUsername(), rememberMe);

		response.put("token", token);
		response.put("username", user.getUsername());
		response.put("id", String.valueOf(user.getId()));
		response.put("admin", String.valueOf(userService.isAdmin(user.getUsername())));
		response.put("message", "Login successful");
		return ResponseEntity.ok(response);
	}

	@PostMapping("/signup")
	public ResponseEntity<Map<String, String>> signup(@RequestBody Map<String, String> request) {
		String name = trim(request.get("name"));
		String email = trim(request.get("email"));
		String password = request.get("password");

		if (name.isEmpty() || email.isEmpty() || password == null || password.isEmpty()) {
			return ResponseEntity.badRequest().body(Map.of("error", "Name, email and password are required."));
		}
		email = email.toLowerCase();
		if (!email.matches(EMAIL_PATTERN)) {
			return ResponseEntity.badRequest().body(Map.of("error", "Please enter a valid email address."));
		}
		if (password.length() < MIN_PASSWORD_LENGTH) {
			return ResponseEntity.badRequest().body(
				Map.of("error", "Password must be at least " + MIN_PASSWORD_LENGTH + " characters."));
		}
		if (userService.findByUsername(email) != null) {
			return ResponseEntity.status(HttpStatus.CONFLICT)
				.body(Map.of("error", "An account with this email already exists."));
		}

		Users created = userService.registerPendingUser(name, email, password);
		notificationService.notifyAdminsOfSignup(created);   // bell icon
		signupEmailService.notifyAdminOfSignup(created);     // email

		return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
			"message", "Thanks for signing up! An administrator will review your request, "
				+ "and you'll get an email once it's approved."));
	}

	@PostMapping("/forgot-password")
	public ResponseEntity<Map<String, String>> forgotpassword(@RequestBody Users request) {
		String email = request.getUsername();
		Users userEmail = userService.findByUsername(email);
		if (userEmail == null) {
			return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Email does not exist"));
		}
		String otp = otpService.generateOTP(email);
		otpService.sendOtpEmail(email, otp);
		return ResponseEntity.ok(Map.of("message", "Proceed to reset password", "email", email));
	}

	@PostMapping("/verify-otp")
	public ResponseEntity<Map<String, String>> verifyOTP(@RequestBody Map<String, String> request) {
		String email = request.get("username");
		String otp = request.get("otp");

		if (otpService.verifyOTP(email, otp)) {
			return ResponseEntity.ok(Map.of("message", "OTP Verified"));
		} else {
			return ResponseEntity.badRequest().body(Map.of("error", "Invalid OTP"));
		}
	}

	@PostMapping("/password-reset")
	public ResponseEntity<String> resetPassword(@RequestBody Map<String, String> request) {
		String email = request.get("username");
		String newPassword = request.get("password");

		if (userService.findByUsername(email) == null) {
			return ResponseEntity.badRequest().body("{\"error\": \"Invalid email\"}");
		}

		boolean success = userService.updatePassword(email, newPassword);
		otpService.clearOTP(email);
		return success ? ResponseEntity.ok("Password reset successful") : ResponseEntity.badRequest().body("Email not found!");
	}

	private static String trim(String value) {
		return value == null ? "" : value.trim();
	}
}