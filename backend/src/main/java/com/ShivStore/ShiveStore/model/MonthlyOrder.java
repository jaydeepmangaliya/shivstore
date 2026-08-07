package com.ShivStore.ShiveStore.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Document(collection = "monthly_orders")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MonthlyOrder {

    @Id
    private String id;

    private String month; // "Jan", "Feb", etc.
    private Integer thisYearOrders;
    private Integer lastYearOrders;
    private Integer year;
}
