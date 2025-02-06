package com.dmg.spring.Printfx.model;

import java.util.Set;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
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

	

	public String getApprove() {
		return approve;
	}

	public void setApprove(String approve) {
		this.approve = approve;
	}

	@ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
        name = "user_role", 
        joinColumns = @JoinColumn(name = "ur_us_id"),  // Ensure correct reference
        inverseJoinColumns = @JoinColumn(name = "ur_ro_id")// Ensure correct reference
    )
    private Set<Role> roleList;

	public Users(int id, String name, String password, Set<Role> roleList) {
		super();
		this.id = id;
		this.username = name;
		this.password = password;
		this.roleList = roleList;
	}

	public String getPassword() {
		return password;
	}

	public void setPassword(String password) {
		this.password = password;
	}

	public Users() {
		super();

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




	public Set<Role> getRoleList() {
		return roleList;
	}

	public void setRoleList(Set<Role> roleList) {
		this.roleList = roleList;
	}

	@Override
	public String toString() {
		return "Users [id=" + id + ", username=" + username + ", password=" + password + ", roleList=" + roleList + "]";
	}

}