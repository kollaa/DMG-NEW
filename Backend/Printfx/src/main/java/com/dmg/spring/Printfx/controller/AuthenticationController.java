package com.dmg.spring.Printfx.controller;

import java.util.Base64;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;


import java.security.Key;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;


import com.dmg.spring.Printfx.model.Users;
import com.dmg.spring.Printfx.repository.UserRepository;
import com.dmg.spring.Printfx.service.UserService;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;

@CrossOrigin("http://localhost:4200")
@RestController
public class AuthenticationController {

    private static final Logger LOGGER = LoggerFactory.getLogger(AuthenticationController.class);
    
    @Autowired 
    UserRepository userRepository;

    @Autowired 
    UserService userService;

    private static final Key SECRET_KEY = Keys.hmacShaKeyFor("your-very-long-secret-key-for-security".getBytes());

    @GetMapping("/authentication")
    public Map<String, String> authenticate(@RequestHeader("Authorization") String authHeader) {
        LOGGER.info("Start of auth function");
        HashMap<String, String> map = new HashMap<>();
        System.out.println(authHeader);
        String email = getUser(authHeader);  // Extract email from Authorization header
        System.out.println(email);

        String jwt = generateJwt(email); // Generate JWT using email
        String[] username =email.split(":");
        Users user = userRepository.findByUsername(username[0]);
        
        System.out.println(user);
        
        if (user == null) {
            throw new UsernameNotFoundException("User not found with email: " + email);
        }

        int userId = user.getId();
        String userID = Integer.toString(userId);

        // Extract roles
        String role = user.getRoleList().toString();

        System.err.println("User Role: " + role);

        LOGGER.debug("JWT: {}", jwt);
        map.put("token", jwt);
        map.put("role", role);
        map.put("id", userID);
        map.put("name", email);

        LOGGER.info("END OF AUTH FUNCTION");
        return map;
    }

    
    private String getUser(String authHeader) {
		String encodedCredentials = authHeader.split(" ", 2)[1];
		String decoded = new String(Base64.getDecoder().decode(encodedCredentials));
		String user = decoded.substring(0, decoded.indexOf(':'));
		return user;
	}

    private String extractUsername(String authHeader) {
        String encodedCredentials = authHeader.split(" ", 2)[1];
        String decoded = new String(Base64.getDecoder().decode(encodedCredentials));
        return decoded.substring(0, decoded.indexOf(':')); // Extract username safely
    }

    private String generateJwt(String user) {
        return Jwts.builder()
                .setSubject(user)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + 1200000)) // 20 minutes expiry
                .signWith(SECRET_KEY, SignatureAlgorithm.HS256)
                .compact();
    }
}
