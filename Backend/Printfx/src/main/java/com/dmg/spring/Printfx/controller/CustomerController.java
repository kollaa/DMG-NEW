package com.dmg.spring.Printfx.controller;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import com.dmg.spring.Printfx.authentication.JWTUtil;
import com.dmg.spring.Printfx.model.Customer;
import com.dmg.spring.Printfx.model.Users;
import com.dmg.spring.Printfx.service.UserService;


@RestController
@RequestMapping("/api/customers")
public class CustomerController {
	
	@Autowired
	private UserService customerService;
	
    @Autowired
    private JWTUtil jwtUtil;
	
	@PostMapping("/login")
    public Map<String, String> login(@RequestBody Users loginRequest) {
        Map<String, String> response = new HashMap<>();	
        System.out.println("+1" + loginRequest);
        Optional<Users> user = customerService.authenticate(
                loginRequest.getUsername(),
                loginRequest.getPassword()
        );
        System.out.println(user);
        if (user.isPresent()) {
            String token = jwtUtil.generateToken(user.get().getUsername());
            response.put("token", token);
            response.put("email", user.get().getUsername());
            response.put("id", String.valueOf(user.get().getId()));
            response.put("message", "Login successful");
        } else {
            response.put("error", "Invalid email or password");
        }

        return response;
    }
}


