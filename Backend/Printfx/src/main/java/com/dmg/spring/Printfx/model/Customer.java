package com.dmg.spring.Printfx.model;
import jakarta.persistence.*;

@Entity
public class Customer {
	
	 @Id
	    @GeneratedValue(strategy = GenerationType.IDENTITY)
	    private Long id;
	 	
	 	@Column(unique = true, nullable = false)
	    private String email;

	    @Column(nullable = false)
	    private String password;

		public Long getId() {
			return id;
		}

		public void setId(Long id) {
			this.id = id;
		}

		public String getEmail() {
			return email;
		}

		public void setEmail(String email) {
			this.email = email;
		}

		public String getPassword() {
			return password;
		}

		public void setPassword(String password) {
			this.password = password;
		}

		@Override
		public String toString() {
			return "Customer [id=" + id + ", email=" + email + ", password=" + password + "]";
		}
	    
	    

}
