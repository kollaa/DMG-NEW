package com.dmg.spring.Printfx.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.dmg.spring.Printfx.model.AccountStatus;
import com.dmg.spring.Printfx.model.Users;

@Repository
public interface UserRepository extends JpaRepository<Users, Long> {

	Users findByUsername(String username);

	// Users.id is an int, so look up by id with a derived query
	// instead of the inherited findById(Long).
	Optional<Users> findUserById(int id);

	List<Users> findByStatusOrderByCreatedAtAsc(AccountStatus status);
}