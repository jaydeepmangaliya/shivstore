package com.ShivStore.ShiveStore.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Document(collection = "daily_revenue")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DailyRevenue {

    @Id
    private String id;
    
    private String day; // "01", "02", etc.
    private Double thisWeekRevenue;
    private Double lastWeekRevenue;
    private String monthName; // "Aug", "Sep", etc.
    private Integer year;
}
