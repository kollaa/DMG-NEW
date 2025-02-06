package com.dmg.spring.Printfx.service;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.dmg.spring.Printfx.model.Customer;
import com.dmg.spring.Printfx.model.Users;
import com.dmg.spring.Printfx.repository.UserRepository;

import jakarta.transaction.Transactional;

@Service
public class UserService {
	
	@Autowired
	private UserRepository customerRepository;
	
	public Optional<Users> authenticate(String email, String password) {
	    // Find the user by email
	    Users user = customerRepository.findByUsername(email);
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
                    return customerRepository.findByUsername(user);
    }

}
  