package com.dmg.spring.Printfx.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.dmg.spring.Printfx.model.Category;

@Repository
public interface CategoryRepository extends JpaRepository<Category, Long> {

    List<Category> findByCompanyIdOrderByDisplayOrderAscNameAsc(Long companyId);

    Optional<Category> findByIdAndCompanyId(Long id, Long companyId);

    boolean existsByCompanyIdAndNameIgnoreCase(Long companyId, String name);

    @Query("select coalesce(max(c.displayOrder), 0) from Category c where c.companyId = :companyId")
    int findMaxDisplayOrder(@Param("companyId") Long companyId);
}   