package com.dmg.spring.Printfx.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.dmg.spring.Printfx.model.Role;

@Repository
public interface RoleRepository extends JpaRepository<Role, Integer> {
	Optional<Role> findByName(String name);

	// Safe even if the role table has duplicate names: always picks the oldest row
	Optional<Role> findFirstByNameOrderByIdAsc(String name);
}