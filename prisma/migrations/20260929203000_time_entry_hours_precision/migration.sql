-- Store fractional hours precisely enough to round-trip whole minutes (minutes / 60).
ALTER TABLE `time_entries` MODIFY `hours` DECIMAL(10, 4) NOT NULL;
