package com.dmg.spring.Printfx.controller;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.dmg.spring.Printfx.authentication.JWTUtil;
import com.dmg.spring.Printfx.model.Customer;
import com.dmg.spring.Printfx.model.Users;
import com.dmg.spring.Printfx.repository.UserRepository;
import com.dmg.spring.Printfx.service.OTPService;
import com.dmg.spring.Printfx.service.UserService;


@RestController
@CrossOrigin("http://localhost:4200")
@RequestMapping("/api/customers")
public class CustomerController {
	
	@Autowired
	private UserService userService;
	
	@Autowired
	private OTPService otpService;
	
	@Autowired
	private UserRepository userRepository;
	
    @Autowired
    private JWTUtil jwtUtil;
	
	@PostMapping("/login")
    public ResponseEntity<Map<String, String>> login(@RequestBody Users loginRequest) {
        Map<String, String> response = new HashMap<>();	
        System.out.println("+1" + loginRequest);
        Optional<Users> user = userService.authenticate(
  
                loginRequest.getUsername(),
                loginRequest.getPassword()
        );
        System.out.println(user);
        if (user.isPresent()) {
            // Generate JWT token if user is authenticated
            String token = jwtUtil.generateToken(user.get().getUsername());
  
            response.put("token", token);
            response.put("email", user.get().getUsername());
            response.put("id", String.valueOf(user.get().getId()));
            response.put("message", "Login successful");
            return ResponseEntity.ok(response);
        } else {
        	response.put("error", "Invalid email or password");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }
        }
	
	@PostMapping("/forgot-password")
	public ResponseEntity<Map<String, String>> forgotpassword(@RequestBody Users request){
		System.out.println("forgot password" + request);
 		String email = request.getUsername();
 		System.out.println("email" + email);
		Users userEmail = userService.findByUsername(email);
		if(userEmail == null) {
			return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Email does not exist"));
		}
		String otp = otpService.generateOTP(email);
        System.out.println("OTP for " + email + " is: " + otp);
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
	        System.out.println(email);
	        String newPassword = request.get("password");
	        System.out.println(newPassword);
	        
	        if (userService.findByUsername(email) == null) {
	        	return ResponseEntity.badRequest().body("{\"error\": \"Invalid email\"}");
	        }

	        boolean success = userService.updatePassword(email, newPassword);
	        otpService.clearOTP(email);
	        return success ? ResponseEntity.ok("Password reset successful") : ResponseEntity.badRequest().body("Email not found!");
	    }
}


