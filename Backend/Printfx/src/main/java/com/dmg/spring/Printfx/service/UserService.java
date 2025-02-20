package com.dmg.spring.Printfx.service;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import com.dmg.spring.Printfx.model.Customer;
import com.dmg.spring.Printfx.model.Users;
import com.dmg.spring.Printfx.repository.UserRepository;

import jakarta.transaction.Transactional;

@Service
public class UserService {
	
	@Autowired
	private UserRepository userRepository;
	
	private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

	
	public Optional<Users> authenticate(String email, String password) {
	    // Find the user by email
	    Users user = userRepository.findByUsername(email);
	    System.out.println(user);
	    // Check if the user exists and if the password matches
	    if (user != null && user.getPassword().equals(password)) {
	        return Optional.of(user); // Return the user wrapped in an Optional if authentication is successful
	    } else {
	        return Optional.empty(); // Return an empty Optional if no user is found or password doesn't match
	    }
	}
	
	@Transactional
    public Users findByUsername(String user){
                    return userRepository.findByUsername(user);
    }

	public boolean updatePassword(String email, String newPassword) {
        Users user = userRepository.findByUsername(email);
        if (user != null) {
            user.setPassword(passwordEncoder.encode(newPassword));  // Hash password before saving
            userRepository.save(user);
            return true;
        }
        return false;
    }

}
  