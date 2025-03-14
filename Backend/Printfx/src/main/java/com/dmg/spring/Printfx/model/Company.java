package com.dmg.spring.Printfx.model;

import jakarta.persistence.*;

@Entity
@Table(name = "companies")
public class Company {
	
	public Long getId() {
		return id;
	}

	public void setId(Long id) {
		this.id = id;
	}

	public String getName() {
		return name;
	}

	public void setName(String name) {
		this.name = name;
	}

	@Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Override
	public String toString() {
		return "Company [id=" + id + ", name=" + name + "]";
	}

	@Column(nullable = false, unique = true)
    private String name;

}
