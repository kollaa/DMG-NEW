package com.dmg.spring.Printfx.model;

import jakarta.persistence.*;

@Entity
@Table(name = "companies")
public class Company {
	
	@Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Override
	public String toString() {
		return "Company [id=" + id + ", name=" + name + "]";
	}

	@Column(nullable = false, unique = true)
    private String name;
	
	@Column(name = "image_url")
    private String imageUrl;

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

	public String getImageUrl() {
		return imageUrl;
	}

	public void setImageUrl(String imageUrl) {
		this.imageUrl = imageUrl;
	}
	
	

}
