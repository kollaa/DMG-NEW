package com.dmg.spring.Printfx.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.dmg.spring.Printfx.model.Company;

@Repository
public interface CompanyRepository extends JpaRepository<Company, Long> {
	List<Company> findAll();

}
