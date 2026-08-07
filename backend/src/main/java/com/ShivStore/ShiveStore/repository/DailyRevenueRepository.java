package com.ShivStore.ShiveStore.repository;

import com.ShivStore.ShiveStore.model.DailyRevenue;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DailyRevenueRepository extends MongoRepository<DailyRevenue, String> {
    List<DailyRevenue> findByMonthNameAndYear(String monthName, Integer year);
}
