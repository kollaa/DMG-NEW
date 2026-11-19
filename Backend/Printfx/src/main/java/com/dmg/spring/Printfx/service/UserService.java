package com.dmg.spring.Printfx.service;

import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import com.dmg.spring.Printfx.model.AccountStatus;
import com.dmg.spring.Printfx.model.Role;
import com.dmg.spring.Printfx.model.Users;
import com.dmg.spring.Printfx.repository.RoleRepository;
import com.dmg.spring.Printfx.repository.UserRepository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.transaction.Transactional;

@Service
public class UserService {

	/** Role given to everyone who signs up (shown as "Viewer" in the app). */
	public static final String CUSTOMER_ROLE = "CUSTOMER";
	public static final String ADMIN_ROLE = "ADMIN";

	@Autowired
	private UserRepository userRepository;

	@Autowired
	private RoleRepository roleRepository;

	@PersistenceContext
	private EntityManager em;

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
		return isAdmin(userRepository.findByUsername(username));
	}

	/** Same check on an already-loaded user (no extra database query). */
	public boolean isAdmin(Users user) {
		return user != null
				&& user.getRoleList() != null
				&& user.getRoleList().stream()
					.map(Role::getName)
					.anyMatch(name -> "ADMIN".equalsIgnoreCase(name) || "ROLE_ADMIN".equalsIgnoreCase(name));
	}

	// ── User management (admin "Users" page) ───────────────────────────

	public List<Users> findAllUsers() {
		return userRepository.findAll(Sort.by("username"));
	}

	public long countAdmins() {
		return userRepository.findAll().stream().filter(this::isAdmin).count();
	}

	/** Account created by an admin: active immediately, with the chosen role. */
	@Transactional
	public Users createUser(String fullName, String email, String rawPassword, String roleName) {
		Users user = new Users();
		user.setUsername(email);
		user.setFullName(fullName);
		user.setPassword(passwordEncoder.encode(rawPassword));
		user.setStatus(AccountStatus.APPROVED);
		user.setRememberMe(false);
		user.setRoleList(new HashSet<>(Set.of(getOrCreateRole(roleName))));
		return userRepository.save(user);
	}

	/** Replaces the user's role(s) with exactly one role. */
	@Transactional
	public Optional<Users> changeRole(int id, String roleName) {
		Optional<Users> user = userRepository.findUserById(id);
		user.ifPresent(u -> {
			u.setRoleList(new HashSet<>(Set.of(getOrCreateRole(roleName))));
			userRepository.save(u);
		});
		return user;
	}

	public Optional<Users> findById(int id) {
		return userRepository.findUserById(id);
	}

	/** How many orders this user has placed (any status). */
	public long countOrders(int userId) {
		Object count = em.createNativeQuery("SELECT COUNT(*) FROM orders WHERE user_id = :id")
				.setParameter("id", userId)
				.getSingleResult();
		return ((Number) count).longValue();
	}

	/**
	 * Permanently deletes a user and everything that points at them.
	 * If deleteOrders is false and they have orders, call countOrders() first and
	 * don't call this; the controller enforces that.
	 */
	@Transactional
	public void deleteUser(int userId, boolean deleteOrders) {
		if (deleteOrders) {
			// Notifications about this user's orders (e.g. admins' approval requests)
			em.createNativeQuery("DELETE FROM notification WHERE order_id IN "
					+ "(SELECT id FROM (SELECT id FROM orders WHERE user_id = :id) AS o)")
					.setParameter("id", userId).executeUpdate();
			em.createNativeQuery("DELETE FROM orders WHERE user_id = :id")
					.setParameter("id", userId).executeUpdate();
		}
		// Notifications sent to this user, and signup notifications about them
		em.createNativeQuery("DELETE FROM notification WHERE recipient_user_id = :id OR related_user_id = :id")
				.setParameter("id", userId).executeUpdate();
		em.createNativeQuery("DELETE FROM user_role WHERE ur_us_id = :id")
				.setParameter("id", userId).executeUpdate();
		em.createNativeQuery("DELETE FROM `user` WHERE us_id = :id")
				.setParameter("id", userId).executeUpdate();
	}

	/** Finds a role by name, creating it the first time it's needed. */
	private Role getOrCreateRole(String name) {
		return roleRepository.findFirstByNameOrderByIdAsc(name).orElseGet(() -> {
			Role role = new Role();
			role.setName(name);
			return roleRepository.save(role);
		});
	}

	private Role getOrCreateCustomerRole() {
		return getOrCreateRole(CUSTOMER_ROLE);
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