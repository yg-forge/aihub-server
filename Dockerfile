FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /workspace
COPY pom.xml .
COPY aihub-common/pom.xml aihub-common/pom.xml
COPY aihub-tenant/pom.xml aihub-tenant/pom.xml
COPY aihub-auth/pom.xml aihub-auth/pom.xml
COPY aihub-system/pom.xml aihub-system/pom.xml
COPY aihub-provider/pom.xml aihub-provider/pom.xml
COPY aihub-model/pom.xml aihub-model/pom.xml
COPY aihub-chat/pom.xml aihub-chat/pom.xml
COPY aihub-bootstrap/pom.xml aihub-bootstrap/pom.xml
RUN mvn -B -ntp -DskipTests dependency:go-offline
COPY . .
RUN mvn -B -ntp clean package -DskipTests

FROM eclipse-temurin:21-jre
WORKDIR /app
RUN useradd --system --create-home --uid 10001 aihub
COPY --from=build /workspace/aihub-bootstrap/target/aihub-bootstrap-0.1.0-SNAPSHOT.jar /app/aihub.jar
RUN chown -R aihub:aihub /app
USER aihub
ENV PORT=10000
EXPOSE 10000
ENTRYPOINT ["java", "-jar", "/app/aihub.jar"]
