package com.omstu.agriculturefield.rotation.repository;

import com.omstu.agriculturefield.rotation.model.WeatherHistoryEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WeatherHistoryRepository extends JpaRepository<WeatherHistoryEntry, Long> {

    Optional<WeatherHistoryEntry> findByLatRoundedAndLonRoundedAndYear(
            Double latRounded, Double lonRounded, Integer year);

    List<WeatherHistoryEntry> findByLatRoundedAndLonRoundedAndYearBetween(
            Double latRounded, Double lonRounded, Integer fromYear, Integer toYear);
}
