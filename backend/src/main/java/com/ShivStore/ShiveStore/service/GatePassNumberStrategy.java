package com.ShivStore.ShiveStore.service;

/**
 * Strategy Pattern — defines the contract for generating unique Gate Pass numbers.
 * Allows swapping strategies (sequential, UUID-based, year-prefixed, etc.)
 * without modifying the service layer (Open/Closed Principle).
 */
public interface GatePassNumberStrategy {

    /**
     * Generate the next unique gate pass number.
     * Implementations may query the DB, use an in-memory counter, etc.
     *
     * @return a unique integer pass number (e.g. 1001, 1002, ...)
     */
    int nextPassNo();
}
