package com.dmg.spring.Printfx.service;

import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import com.dmg.spring.Printfx.model.AccountStatus;
import com.dmg.spring.Printfx.model.Role;
import com.dmg.spring.Printfx.model.Users;
import com.dmg.spring.Printfx.repository.RoleRepository;
import com.dmg.spring.Printfx.repository.UserRepository;

import jakarta.transaction.Transactional;

@Service
public class UserService {

	/** Role given to everyone who signs up. Admins are only ever assigned manually. */
	public static final String CUSTOMER_ROLE = "CUSTOMER";

	@Autowired
	private UserRepository userRepository;

	@Autowired
	private RoleRepository roleRepository;

	private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

	/**
	 * Checks email + password.
	 * Supports both BCrypt-hashed passwords and old plain-text ones; a plain-text
	 * password is upgraded to a hash automatically on a successful login.
	 */
	@Transactional
	public Optional<Users> authenticate(String email, String rawPassword) {
		if (email == null || rawPassword == null) {
			return Optional.empty();
		}
		Users user = userRepository.findByUsername(email.trim());
		if (user == null || user.getPassword() == null) {
			return Optional.empty();
		}

		String stored = user.getPassword();

		if (isBcryptHash(stored)) {
			return passwordEncoder.matches(rawPassword, stored) ? Optional.of(user) : Optional.empty();
		}

		// Legacy plain-text password: compare, then upgrade to a hash
		if (stored.equals(rawPassword)) {
			user.setPassword(passwordEncoder.encode(rawPassword));
			userRepository.save(user);
			return Optional.of(user);
		}
		return Optional.empty();
	}

	/** Kept so any existing callers using the old signature still compile. */
	public Optional<Users> authenticate(String email, String rawPassword, Boolean rememberMe) {
		return authenticate(email, rawPassword);
	}

	@Transactional
	public Users findByUsername(String username) {
		return userRepository.findByUsername(username);
	}

	/** Creates a new account that cannot log in until an admin approves it. */
	@Transactional
	public Users registerPendingUser(String fullName, String email, String rawPassword) {
		Users user = new Users();
		user.setUsername(email);
		user.setFullName(fullName);
		user.setPassword(passwordEncoder.encode(rawPassword));
		user.setStatus(AccountStatus.PENDING);
		user.setRememberMe(false);
		user.setRoleList(new HashSet<>(Set.of(getOrCreateCustomerRole())));
		return userRepository.save(user);
	}

	public List<Users> findPendingUsers() {
		return userRepository.findByStatusOrderByCreatedAtAsc(AccountStatus.PENDING);
	}

	@Transactional
	public Optional<Users> updateStatus(int id, AccountStatus status) {
		Optional<Users> user = userRepository.findUserById(id);
		user.ifPresent(u -> {
			u.setStatus(status);
			userRepository.save(u);
		});
		return user;
	}

	/** True if the user has the ADMIN role (same rule NotificationService uses). */
	public boolean isAdmin(String username) {
		if (username == null) {
			return false;
		}
		Users user = userRepository.findByUsername(username);
		return user != null
				&& user.getRoleList() != null
				&& user.getRoleList().stream()
					.map(Role::getName)
					.anyMatch(name -> "ADMIN".equalsIgnoreCase(name) || "ROLE_ADMIN".equalsIgnoreCase(name));
	}

	/** Finds the CUSTOMER role, creating it the first time it's needed. */
	private Role getOrCreateCustomerRole() {
		return roleRepository.findByName(CUSTOMER_ROLE).orElseGet(() -> {
			Role role = new Role();
			role.setName(CUSTOMER_ROLE);
			return roleRepository.save(role);
		});
	}

	@Transactional
	public boolean updatePassword(String email, String rawPassword) {
		Users user = userRepository.findByUsername(email);
		if (user != null) {
			user.setPassword(passwordEncoder.encode(rawPassword));
			userRepository.save(user);
			return true;
		}
		return false;
	}

	private boolean isBcryptHash(String value) {
		return value.startsWith("$2a$") || value.startsWith("$2b$") || value.startsWith("$2y$");
	}
}