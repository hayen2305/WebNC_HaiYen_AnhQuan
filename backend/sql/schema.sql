CREATE TABLE IF NOT EXISTS services (
	id CHAR(36) NOT NULL,
	name VARCHAR(255) NOT NULL,
	duration_minutes INT NOT NULL,
	price DECIMAL(12, 2) NOT NULL,
	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY (id),
	CONSTRAINT chk_services_duration CHECK (duration_minutes > 0),
	CONSTRAINT chk_services_price CHECK (price >= 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS staff (
	id CHAR(36) NOT NULL,
	name VARCHAR(255) NOT NULL,
	email VARCHAR(255) NOT NULL,
	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY (id),
	UNIQUE KEY uq_staff_email (email)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS working_hours (
	id CHAR(36) NOT NULL,
	staff_id CHAR(36) NOT NULL,
	day_of_week TINYINT NOT NULL,
	start_time TIME NOT NULL,
	end_time TIME NOT NULL,
	PRIMARY KEY (id),
	UNIQUE KEY uq_working_hours_staff_day (staff_id, day_of_week),
	CONSTRAINT fk_working_hours_staff
		FOREIGN KEY (staff_id) REFERENCES staff (id)
		ON DELETE CASCADE,
	CONSTRAINT chk_working_hours_day CHECK (day_of_week BETWEEN 0 AND 6),
	CONSTRAINT chk_working_hours_range CHECK (start_time < end_time)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS appointments (
	id CHAR(36) NOT NULL,
	user_id VARCHAR(255) NOT NULL,
	staff_id CHAR(36) NOT NULL,
	service_id CHAR(36) NOT NULL,
	start_at DATETIME NOT NULL,
	end_at DATETIME NOT NULL,
	status ENUM('PENDING', 'CONFIRMED', 'CANCELLED') NOT NULL DEFAULT 'CONFIRMED',
	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY (id),
	KEY idx_appointments_staff_time (staff_id, start_at, end_at),
	CONSTRAINT fk_appointments_staff
		FOREIGN KEY (staff_id) REFERENCES staff (id),
	CONSTRAINT fk_appointments_service
		FOREIGN KEY (service_id) REFERENCES services (id),
	CONSTRAINT chk_appointments_range CHECK (start_at < end_at)
) ENGINE=InnoDB;
