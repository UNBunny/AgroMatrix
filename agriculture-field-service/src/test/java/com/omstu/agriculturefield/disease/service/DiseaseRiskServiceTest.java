package com.omstu.agriculturefield.disease.service;

import com.omstu.agriculturefield.disease.dto.DiseaseRiskItem;
import com.omstu.agriculturefield.disease.dto.DiseaseRiskResponse;
import com.omstu.agriculturefield.disease.dto.WeatherForecastData;
import com.omstu.agriculturefield.disease.model.DiseaseRiskRule;
import com.omstu.agriculturefield.disease.model.enums.DiseaseType;
import com.omstu.agriculturefield.disease.model.enums.RiskLevel;
import com.omstu.agriculturefield.disease.repository.DiseaseRiskRuleRepository;
import com.omstu.agriculturefield.disease.service.impl.DiseaseRiskServiceImpl;
import com.omstu.agriculturefield.disease.service.impl.WeatherServiceClient;
import com.omstu.agriculturefield.field.model.AgriculturalField;
import com.omstu.agriculturefield.field.repository.AgriculturalFieldRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.Polygon;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("DiseaseRiskService Unit Tests")
class DiseaseRiskServiceTest {

    @Mock
    private WeatherServiceClient weatherServiceClient;

    @Mock
    private DiseaseRiskRuleRepository riskRuleRepository;

    @Mock
    private AgriculturalFieldRepository fieldRepository;

    @InjectMocks
    private DiseaseRiskServiceImpl diseaseRiskService;

    private AgriculturalField testField;
    private GeometryFactory geometryFactory;

    @BeforeEach
    void setUp() {
        geometryFactory = new GeometryFactory();
        
        Coordinate[] coordinates = new Coordinate[]{
            new Coordinate(55.0, 55.0),
            new Coordinate(55.1, 55.0),
            new Coordinate(55.1, 55.1),
            new Coordinate(55.0, 55.1),
            new Coordinate(55.0, 55.0)
        };
        Polygon polygon = geometryFactory.createPolygon(coordinates);
        
        testField = new AgriculturalField();
        testField.setId(1L);
        testField.setFieldName("Тестовое поле");
        testField.setGeom(polygon);
    }

    @Test
    @DisplayName("Оценка риска засухи: Критический уровень при ГТК < 0.4")
    void assessDroughtRisk_CriticalGTK_ReturnsCritical() {
        WeatherForecastData weather = new WeatherForecastData(
            0.3,
            50.0,
            1000.0,
            5,
            -2.0,
            "MEDIUM",
            18.0,
            0,
            3,
            65.0
        );

        when(fieldRepository.findById(1L)).thenReturn(Optional.of(testField));
        when(weatherServiceClient.getForecastMetrics(anyDouble(), anyDouble(), anyInt()))
            .thenReturn(Mono.just(weather));
        when(riskRuleRepository.findActiveRulesByCrop(anyString())).thenReturn(List.of());

        StepVerifier.create(diseaseRiskService.assessFieldRisk(1L, "пшеница"))
            .assertNext(response -> {
                assertNotNull(response);
                assertEquals(RiskLevel.CRITICAL, response.droughtRisk());
                assertEquals(0.3, response.gtk());
                assertTrue(response.droughtDescription().contains("ГТК"));
            })
            .verifyComplete();

        verify(weatherServiceClient, times(1)).getForecastMetrics(anyDouble(), anyDouble(), eq(14));
    }

    @Test
    @DisplayName("Оценка риска засухи: Высокий уровень при ГТК 0.4-0.7")
    void assessDroughtRisk_HighGTK_ReturnsHigh() {
        WeatherForecastData weather = new WeatherForecastData(
            0.6,
            50.0,
            1000.0,
            5,
            -2.0,
            "MEDIUM",
            18.0,
            0,
            3,
            65.0
        );

        when(fieldRepository.findById(1L)).thenReturn(Optional.of(testField));
        when(weatherServiceClient.getForecastMetrics(anyDouble(), anyDouble(), anyInt()))
            .thenReturn(Mono.just(weather));
        when(riskRuleRepository.findActiveRulesByCrop(anyString())).thenReturn(List.of());

        StepVerifier.create(diseaseRiskService.assessFieldRisk(1L, "пшеница"))
            .assertNext(response -> {
                assertEquals(RiskLevel.HIGH, response.droughtRisk());
                assertEquals(0.6, response.gtk());
            })
            .verifyComplete();
    }

    @Test
    @DisplayName("Оценка риска засухи: Средний уровень при ГТК 0.7-1.0")
    void assessDroughtRisk_MediumGTK_ReturnsMedium() {
        WeatherForecastData weather = new WeatherForecastData(
            0.85,
            50.0,
            1000.0,
            5,
            -2.0,
            "MEDIUM",
            18.0,
            0,
            3,
            65.0
        );

        when(fieldRepository.findById(1L)).thenReturn(Optional.of(testField));
        when(weatherServiceClient.getForecastMetrics(anyDouble(), anyDouble(), anyInt()))
            .thenReturn(Mono.just(weather));
        when(riskRuleRepository.findActiveRulesByCrop(anyString())).thenReturn(List.of());

        StepVerifier.create(diseaseRiskService.assessFieldRisk(1L, "пшеница"))
            .assertNext(response -> {
                assertEquals(RiskLevel.MEDIUM, response.droughtRisk());
            })
            .verifyComplete();
    }

    @Test
    @DisplayName("Оценка риска засухи: Низкий уровень при ГТК > 1.0")
    void assessDroughtRisk_GoodGTK_ReturnsLow() {
        WeatherForecastData weather = new WeatherForecastData(
            1.5,
            50.0,
            1000.0,
            5,
            -2.0,
            "MEDIUM",
            18.0,
            0,
            3,
            65.0
        );

        when(fieldRepository.findById(1L)).thenReturn(Optional.of(testField));
        when(weatherServiceClient.getForecastMetrics(anyDouble(), anyDouble(), anyInt()))
            .thenReturn(Mono.just(weather));
        when(riskRuleRepository.findActiveRulesByCrop(anyString())).thenReturn(List.of());

        StepVerifier.create(diseaseRiskService.assessFieldRisk(1L, "пшеница"))
            .assertNext(response -> {
                assertEquals(RiskLevel.LOW, response.droughtRisk());
            })
            .verifyComplete();
    }

    @Test
    @DisplayName("Оценка риска заморозков: Критический при T <= -10°C")
    void assessFrostRisk_CriticalTemp_ReturnsCritical() {
        WeatherForecastData weather = new WeatherForecastData(
            1.2,              // gtk
            1000.0,           // sumPrecipitation
            1000.0,           // sumEffectiveTemp
            0,                // heatStressDays
            -12.0,            // minTempRecord
            "MEDIUM",         // stressLevel
            -5.0,             // avgTemp
            0,                // extremeHeatDays
            3,                // longestDryPeriod
            65.0              // avgHumidity
        );

        when(fieldRepository.findById(1L)).thenReturn(Optional.of(testField));
        when(weatherServiceClient.getForecastMetrics(anyDouble(), anyDouble(), anyInt()))
            .thenReturn(Mono.just(weather));
        when(riskRuleRepository.findActiveRulesByCrop(anyString())).thenReturn(List.of());

        StepVerifier.create(diseaseRiskService.assessFieldRisk(1L, "пшеница"))
            .assertNext(response -> {
                assertEquals(RiskLevel.CRITICAL, response.frostRisk());
                assertEquals(-5.0, response.avgTemp());
            })
            .verifyComplete();
    }

    @Test
    @DisplayName("Оценка риска заморозков: Высокий при T <= -5°C")
    void assessFrostRisk_HighTemp_ReturnsHigh() {
        WeatherForecastData weather = new WeatherForecastData(
            1.2,              // gtk
            1000.0,           // sumPrecipitation
            1000.0,           // sumEffectiveTemp
            0,                // heatStressDays
            -7.0,             // minTempRecord
            "MEDIUM",         // stressLevel
            2.0,              // avgTemp
            0,                // extremeHeatDays
            3,                // longestDryPeriod
            65.0              // avgHumidity
        );

        when(fieldRepository.findById(1L)).thenReturn(Optional.of(testField));
        when(weatherServiceClient.getForecastMetrics(anyDouble(), anyDouble(), anyInt()))
            .thenReturn(Mono.just(weather));
        when(riskRuleRepository.findActiveRulesByCrop(anyString())).thenReturn(List.of());

        StepVerifier.create(diseaseRiskService.assessFieldRisk(1L, "пшеница"))
            .assertNext(response -> {
                assertEquals(RiskLevel.HIGH, response.frostRisk());
            })
            .verifyComplete();
    }

    @Test
    @DisplayName("Оценка теплового стресса: Критический при >= 7 дней жары")
    void assessHeatStressRisk_SevenDays_ReturnsCritical() {
        WeatherForecastData weather = new WeatherForecastData(
            1.2,
            50.0,
            1000.0,
            7,
            -2.0,
            "MEDIUM",
            18.0,
            7,
            3,
            65.0
        );

        when(fieldRepository.findById(1L)).thenReturn(Optional.of(testField));
        when(weatherServiceClient.getForecastMetrics(anyDouble(), anyDouble(), anyInt()))
            .thenReturn(Mono.just(weather));
        when(riskRuleRepository.findActiveRulesByCrop(anyString())).thenReturn(List.of());

        StepVerifier.create(diseaseRiskService.assessFieldRisk(1L, "пшеница"))
            .assertNext(response -> {
                assertEquals(RiskLevel.CRITICAL, response.heatStressRisk());
                assertEquals(7, response.heatStressDays());
            })
            .verifyComplete();
    }

    @Test
    @DisplayName("Оценка теплового стресса: Высокий при >= 5 дней жары")
    void assessHeatStressRisk_FiveDays_ReturnsHigh() {
        WeatherForecastData weather = new WeatherForecastData(
            1.2,
            50.0,
            1000.0,
            5,
            -2.0,
            "MEDIUM",
            18.0,
            5,
            3,
            65.0
        );

        when(fieldRepository.findById(1L)).thenReturn(Optional.of(testField));
        when(weatherServiceClient.getForecastMetrics(anyDouble(), anyDouble(), anyInt()))
            .thenReturn(Mono.just(weather));
        when(riskRuleRepository.findActiveRulesByCrop(anyString())).thenReturn(List.of());

        StepVerifier.create(diseaseRiskService.assessFieldRisk(1L, "пшеница"))
            .assertNext(response -> {
                assertEquals(RiskLevel.CRITICAL, response.heatStressRisk());
            })
            .verifyComplete();
    }

    @Test
    @DisplayName("Оценка болезней: Все условия выполнены - базовый уровень риска")
    void assessDiseaseRisks_AllConditionsMet_ReturnsBaseLevel() {
        WeatherForecastData weather = new WeatherForecastData(
            1.2,
            25.0,
            1200.0,
            3,
            2.0,
            "LOW",
            18.0,
            0,
            2,
            65.0
        );

        DiseaseRiskRule rule = DiseaseRiskRule.builder()
                .id(1L)
                .diseaseName("Бурая ржавчина")
                .diseaseType(DiseaseType.FUNGAL)
                .affectedCrops("пшеница")
                .riskLevel(RiskLevel.HIGH)
                .riskWeight(0.8)
                .tempMinThreshold(15.0)
                .tempMaxThreshold(22.0)
                .precipMin7d(10.0)
                .gtkMin(1.0)
                .preventionAdvice("Профилактическая обработка")
                .treatmentAdvice("Применить фунгицид")
                .urgencyDays(5)
                .build();

        when(fieldRepository.findById(1L)).thenReturn(Optional.of(testField));
        when(weatherServiceClient.getForecastMetrics(anyDouble(), anyDouble(), anyInt()))
            .thenReturn(Mono.just(weather));
        when(riskRuleRepository.findActiveRulesByCrop("пшеница")).thenReturn(List.of(rule));

        StepVerifier.create(diseaseRiskService.assessFieldRisk(1L, "пшеница"))
            .assertNext(response -> {
                assertNotNull(response);
                assertFalse(response.diseaseRisks().isEmpty());
                
                DiseaseRiskItem riskItem = response.diseaseRisks().get(0);
                assertEquals("Бурая ржавчина", riskItem.diseaseName());
                assertEquals(RiskLevel.HIGH, riskItem.riskLevel());
                assertTrue(riskItem.riskScore() > 0);
                assertNotNull(riskItem.preventionAdvice());
                assertNotNull(riskItem.treatmentAdvice());
            })
            .verifyComplete();

        verify(riskRuleRepository, times(1)).findActiveRulesByCrop("пшеница");
    }

    @Test
    @DisplayName("Fallback: Прогноз недоступен - используются исторические данные")
    void assessFieldRisk_ForecastUnavailable_UsesHistoricalData() {
        WeatherForecastData historicalWeather = new WeatherForecastData(
            1.0,
            45.0,
            800.0,
            4,
            -1.0,
            "MEDIUM",
            16.0,
            2,
            5,
            65.0
        );

        when(fieldRepository.findById(1L)).thenReturn(Optional.of(testField));
        when(weatherServiceClient.getForecastMetrics(anyDouble(), anyDouble(), anyInt()))
            .thenReturn(Mono.empty());
        when(weatherServiceClient.getHistoricalMetrics(anyDouble(), anyDouble(), anyString(), anyString()))
            .thenReturn(Mono.just(historicalWeather));
        when(riskRuleRepository.findActiveRulesByCrop(anyString())).thenReturn(List.of());

        StepVerifier.create(diseaseRiskService.assessFieldRisk(1L, "пшеница"))
            .assertNext(response -> {
                assertNotNull(response);
                assertEquals("HISTORICAL", response.dataSource());
                assertEquals(1.0, response.gtk());
            })
            .verifyComplete();

        verify(weatherServiceClient, times(1)).getForecastMetrics(anyDouble(), anyDouble(), eq(14));
        verify(weatherServiceClient, times(1)).getHistoricalMetrics(anyDouble(), anyDouble(), anyString(), anyString());
    }

    @Test
    @DisplayName("Fallback: Все источники недоступны - возвращается базовая оценка")
    void assessFieldRisk_AllSourcesUnavailable_ReturnsFallback() {
        when(fieldRepository.findById(1L)).thenReturn(Optional.of(testField));
        when(weatherServiceClient.getForecastMetrics(anyDouble(), anyDouble(), anyInt()))
            .thenReturn(Mono.empty());
        when(weatherServiceClient.getHistoricalMetrics(anyDouble(), anyDouble(), anyString(), anyString()))
            .thenReturn(Mono.empty());

        StepVerifier.create(diseaseRiskService.assessFieldRisk(1L, "пшеница"))
            .assertNext(response -> {
                assertNotNull(response);
                assertEquals("FALLBACK", response.dataSource());
                assertEquals(RiskLevel.MEDIUM, response.overallRiskLevel());
                assertTrue(response.recommendations().stream()
                    .anyMatch(r -> r.contains("недоступны")));
            })
            .verifyComplete();
    }

    @Test
    @DisplayName("Ошибка: Поле не найдено")
    void assessFieldRisk_FieldNotFound_ThrowsException() {
        when(fieldRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> {
            diseaseRiskService.assessFieldRisk(999L, "пшеница");
        });
    }

    @Test
    @DisplayName("Общий уровень риска: Максимум из всех рисков")
    void assessFieldRisk_OverallRisk_IsMaximumOfAllRisks() {
        WeatherForecastData weather = new WeatherForecastData(
            0.3,
            50.0,
            1000.0,
            5,
            -12.0,
            "MEDIUM",
            18.0,
            7,
            14,
            65.0
        );

        when(fieldRepository.findById(1L)).thenReturn(Optional.of(testField));
        when(weatherServiceClient.getForecastMetrics(anyDouble(), anyDouble(), anyInt()))
            .thenReturn(Mono.just(weather));
        when(riskRuleRepository.findActiveRulesByCrop(anyString())).thenReturn(List.of());

        StepVerifier.create(diseaseRiskService.assessFieldRisk(1L, "пшеница"))
            .assertNext(response -> {
                assertEquals(RiskLevel.CRITICAL, response.droughtRisk());
                assertEquals(RiskLevel.CRITICAL, response.frostRisk());
                assertEquals(RiskLevel.CRITICAL, response.heatStressRisk());
                assertEquals(RiskLevel.CRITICAL, response.overallRiskLevel());
                assertTrue(response.overallRiskScore() >= 0.8);
            })
            .verifyComplete();
    }

    @Test
    @DisplayName("Рекомендации: Генерируются для всех критических рисков")
    void assessFieldRisk_Recommendations_GeneratedForCriticalRisks() {
        WeatherForecastData weather = new WeatherForecastData(
            0.3,
            50.0,
            1000.0,
            5,
            -2.0,
            "MEDIUM",
            18.0,
            0,
            14,
            65.0
        );

        when(fieldRepository.findById(1L)).thenReturn(Optional.of(testField));
        when(weatherServiceClient.getForecastMetrics(anyDouble(), anyDouble(), anyInt()))
            .thenReturn(Mono.just(weather));
        when(riskRuleRepository.findActiveRulesByCrop(anyString())).thenReturn(List.of());

        StepVerifier.create(diseaseRiskService.assessFieldRisk(1L, "пшеница"))
            .assertNext(response -> {
                assertNotNull(response.recommendations());
                assertFalse(response.recommendations().isEmpty());
            })
            .verifyComplete();
    }

    @Test
    @DisplayName("Метаданные: Время оценки и источник данных корректны")
    void assessFieldRisk_Metadata_IsCorrect() {
        WeatherForecastData weather = new WeatherForecastData(
            1.2,
            50.0,
            1000.0,
            5,
            -2.0,
            "MEDIUM",
            18.0,
            0,
            3,
            65.0
        );

        when(fieldRepository.findById(1L)).thenReturn(Optional.of(testField));
        when(weatherServiceClient.getForecastMetrics(anyDouble(), anyDouble(), anyInt()))
            .thenReturn(Mono.just(weather));
        when(riskRuleRepository.findActiveRulesByCrop(anyString())).thenReturn(List.of());

        StepVerifier.create(diseaseRiskService.assessFieldRisk(1L, "пшеница"))
            .assertNext(response -> {
                assertEquals(1L, response.fieldId());
                assertEquals("Тестовое поле", response.fieldName());
                assertEquals("пшеница", response.cropName());
                assertEquals("FORECAST", response.dataSource());
                assertNotNull(response.assessmentTime());
            })
            .verifyComplete();
    }
}
