package com.ShivStore.ShiveStore.repository;

import com.ShivStore.ShiveStore.model.MonthlyOrder;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MonthlyOrderRepository extends MongoRepository<MonthlyOrder, String> {
    List<MonthlyOrder> findByYear(Integer year);
}
