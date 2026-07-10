package com.miguex.dashboard.cruce.config;

import jakarta.persistence.EntityManagerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.jdbc.DataSourceBuilder;
import org.springframework.boot.orm.jpa.EntityManagerFactoryBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.transaction.PlatformTransactionManager;

import javax.sql.DataSource;
import java.util.Map;

/**
 * Segunda base de datos, exclusiva del cruce de matrículas x ventas (cruce_matriculas.html).
 * Es una base MySQL propia y separada ({@code cruce}) en el mismo servidor: NO comparte tablas
 * ni transacciones con la BBDD principal ({@code dashboard}). La consigna es que los dos Excel
 * del cruce se guarden aislados del resto del tablero.
 *
 * <p>La URL usa {@code createDatabaseIfNotExist=true} y credenciales con permiso de creación
 * (root por defecto) para que el schema {@code cruce} se cree solo la primera vez, sin pasos
 * manuales. Escanea únicamente {@code com.miguex.dashboard.cruce.model} / {@code ...cruce.repo}.
 */
@Configuration
@EnableJpaRepositories(
        basePackages = "com.miguex.dashboard.cruce.repo",
        entityManagerFactoryRef = "cruceEntityManagerFactory",
        transactionManagerRef = "cruceTransactionManager")
public class CruceDbConfig {

    @Bean
    public DataSource cruceDataSource(
            @Value("${cruce.datasource.url}") String url,
            @Value("${cruce.datasource.username:root}") String username,
            @Value("${cruce.datasource.password:rootpass}") String password,
            @Value("${cruce.datasource.driver-class-name:com.mysql.cj.jdbc.Driver}") String driver) {
        return DataSourceBuilder.create()
                .url(url).username(username).password(password).driverClassName(driver)
                .build();
    }

    @Bean
    public LocalContainerEntityManagerFactoryBean cruceEntityManagerFactory(
            EntityManagerFactoryBuilder builder,
            @Qualifier("cruceDataSource") DataSource dataSource,
            @Value("${cruce.jpa.hibernate.ddl-auto:update}") String ddlAuto,
            @Value("${cruce.jpa.properties.hibernate.dialect:org.hibernate.dialect.MySQLDialect}") String dialect) {
        return builder
                .dataSource(dataSource)
                .packages("com.miguex.dashboard.cruce.model")
                .persistenceUnit("cruce")
                .properties(Map.of(
                        "hibernate.hbm2ddl.auto", ddlAuto,
                        "hibernate.dialect", dialect))
                .build();
    }

    @Bean
    public PlatformTransactionManager cruceTransactionManager(
            @Qualifier("cruceEntityManagerFactory") EntityManagerFactory emf) {
        return new JpaTransactionManager(emf);
    }
}
