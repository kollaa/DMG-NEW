package com.dmg.spring.Printfx.repository;

import com.dmg.spring.Printfx.model.Order;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OrderRepository extends JpaRepository<Order, Long> {

    // Newest-first, matching the "Date (New-Old)" default sort on the cart page
    List<Order> findByUser_IdOrderByModifiedDateDesc(int userId);

    List<Order> findByUser_IdAndStatusOrderByModifiedDateDesc(int userId, String status);
}