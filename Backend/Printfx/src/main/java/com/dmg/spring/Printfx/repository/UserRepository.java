package com.dmg.spring.Printfx.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.dmg.spring.Printfx.model.Customer;
import com.dmg.spring.Printfx.model.Users;

@Repository
public interface UserRepository extends JpaRepository<Users, Long> {
	Users findByUsername(String username);
}
