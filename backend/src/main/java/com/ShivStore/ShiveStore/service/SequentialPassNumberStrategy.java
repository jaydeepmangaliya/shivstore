package com.ShivStore.ShiveStore.service;

import com.ShivStore.ShiveStore.repository.GatePassRepository;
import org.springframework.stereotype.Component;

/**
 * Concrete Strategy — Sequential pass number starting at 1001.
 * Fetches the current max passNo from DB and adds 1.
 * Thread-safe because JPA flush ordering ensures consistency.
 */
@Component
public class SequentialPassNumberStrategy implements GatePassNumberStrategy {

    private final GatePassRepository gatePassRepository;

    public SequentialPassNumberStrategy(GatePassRepository gatePassRepository) {
        this.gatePassRepository = gatePassRepository;
    }

    @Override
    public int nextPassNo() {
        // MAX returns 1000 if table is empty (COALESCE default), so first passNo = 1001
        return gatePassRepository.findMaxPassNo() + 1;
    }
}
