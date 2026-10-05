package com.dmg.spring.Printfx.model;

import java.time.LocalDateTime;
import java.util.Set;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(name = "user")
public class Users {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "us_id")
	int id;

	@Column(name = "us_name")
	private String username;

	@Column(name = "us_password")
	private String password;

	@Column(name = "us_approve")
	private String approve;

	@Column(name = "us_rememberMe")
	private Boolean rememberMe;

	// ---- New for signup / admin approval ----

	@Column(name = "us_full_name")
	private String fullName;

	// NULL for accounts that existed before signup was added -> treated as APPROVED
	@Enumerated(EnumType.STRING)
	@Column(name = "us_status", length = 20)
	private AccountStatus status;

	@Column(name = "us_created_at")
	private LocalDateTime createdAt;

	@ManyToMany(fetch = FetchType.EAGER)
	@JoinTable(
		name = "user_role",
		joinColumns = @JoinColumn(name = "ur_us_id"),
		inverseJoinColumns = @JoinColumn(name = "ur_ro_id")
	)
	private Set<Role> roleList;

	public Users() {
		super();
	}

	public Users(int id, String name, String password, Set<Role> roleList) {
		super();
		this.id = id;
		this.username = name;
		this.password = password;
		this.roleList = roleList;
	}

	@PrePersist
	protected void onCreate() {
		if (createdAt == null) {
			createdAt = LocalDateTime.now();
		}
	}

	/** Existing accounts (status NULL) and approved accounts may log in. */
	public boolean isApproved() {
		return status == null || status == AccountStatus.APPROVED;
	}

	public int getId() {
		return id;
	}

	public void setId(int id) {
		this.id = id;
	}

	public String getUsername() {
		return username;
	}

	public void setUsername(String name) {
		this.username = name;
	}

	public String getPassword() {
		return password;
	}

	public void setPassword(String password) {
		this.password = password;
	}

	public String getApprove() {
		return approve;
	}

	public void setApprove(String approve) {
		this.approve = approve;
	}

	public Boolean isRememberMe() {
		return rememberMe;
	}

	public void setRememberMe(Boolean rememberMe) {
		this.rememberMe = rememberMe;
	}

	public String getFullName() {
		return fullName;
	}

	public void setFullName(String fullName) {
		this.fullName = fullName;
	}

	public AccountStatus getStatus() {
		return status;
	}

	public void setStatus(AccountStatus status) {
		this.status = status;
	}

	public LocalDateTime getCreatedAt() {
		return createdAt;
	}

	public void setCreatedAt(LocalDateTime createdAt) {
		this.createdAt = createdAt;
	}

	public Set<Role> getRoleList() {
		return roleList;
	}

	public void setRoleList(Set<Role> roleList) {
		this.roleList = roleList;
	}

	// Password deliberately excluded so it never appears in logs
	@Override
	public String toString() {
		return "Users [id=" + id + ", username=" + username + ", fullName=" + fullName
				+ ", status=" + status + ", roleList=" + roleList + "]";
	}
}