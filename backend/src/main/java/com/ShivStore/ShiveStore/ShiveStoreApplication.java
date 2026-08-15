package com.ShivStore.ShiveStore;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class ShiveStoreApplication {

	public static void main(String[] args) {
		SpringApplication.run(ShiveStoreApplication.class, args);
	}

}
