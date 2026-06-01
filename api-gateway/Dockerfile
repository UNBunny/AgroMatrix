FROM maven:3.9-eclipse-temurin-21 AS builder
WORKDIR /build
COPY pom.xml .
COPY eureka-server/pom.xml eureka-server/pom.xml
COPY auth-service/pom.xml auth-service/pom.xml
COPY ndvi-service/pom.xml ndvi-service/pom.xml
COPY agriculture-field-service/pom.xml agriculture-field-service/pom.xml
COPY weather-service/pom.xml weather-service/pom.xml
COPY api-gateway/pom.xml api-gateway/pom.xml
COPY api-gateway/src api-gateway/src
RUN mvn package -DskipTests -pl api-gateway -am

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=builder /build/api-gateway/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
