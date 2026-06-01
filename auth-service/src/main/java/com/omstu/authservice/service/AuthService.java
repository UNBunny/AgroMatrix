package com.omstu.authservice.service;

import com.omstu.authservice.dto.*;
import com.omstu.authservice.entity.RefreshToken;
import com.omstu.authservice.entity.User;
import com.omstu.authservice.repository.RefreshTokenRepository;
import com.omstu.authservice.repository.UserRepository;
import com.omstu.authservice.security.JwtService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    @Value("${jwt.refresh-expiration-days:7}")
    private long refreshExpirationDays;

    @Transactional
    public AuthResponse joinByCode(JoinByCodeRequest request, Long farmId) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new IllegalArgumentException("Пользователь с таким именем уже существует");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Пользователь с таким email уже существует");
        }
        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role(com.omstu.authservice.entity.UserRole.AGRONOMIST)
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .phone(request.getPhone())
                .activeFarmId(farmId)
                .build();
        user.getFarmIds().add(farmId);
        user = userRepository.save(user);
        log.info("User joined farm: username={}, farmId={}", user.getUsername(), farmId);
        return buildFullAuthResponse(user);
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new IllegalArgumentException("Пользователь с таким именем уже существует");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Пользователь с таким email уже существует");
        }

        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role(request.getRole())
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .organization(request.getOrganization())
                .phone(request.getPhone())
                .activeFarmId(request.getFarmId())
                .build();
        if (request.getFarmId() != null) {
            user.getFarmIds().add(request.getFarmId());
        }
        user = userRepository.save(user);
        log.info("User registered: username={}, role={}", user.getUsername(), user.getRole());
        return buildFullAuthResponse(user);
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
        );
        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("Пользователь не найден"));
        return buildFullAuthResponse(user);
    }

    @Transactional
    public AuthResponse refresh(String rawRefreshToken) {
        RefreshToken token = refreshTokenRepository.findByToken(rawRefreshToken)
                .orElseThrow(() -> new IllegalArgumentException("Refresh token не найден"));

        if (!token.isValid()) {
            throw new IllegalArgumentException("Refresh token истёк или отозван");
        }

        User user = token.getUser();
        String newAccessToken = jwtService.generateToken(user, buildExtraClaims(user));
        String newRawRefresh = rotateRefreshToken(token, user);

        return buildAuthResponse(user, newAccessToken, newRawRefresh);
    }

    @Transactional
    public void logout(String rawRefreshToken) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) return;
        refreshTokenRepository.findByToken(rawRefreshToken).ifPresent(token -> {
            token.setRevoked(true);
            refreshTokenRepository.save(token);
        });
    }

    @Transactional
    public void assignFarm(String username, Long farmId) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("Пользователь не найден"));
        user.getFarmIds().add(farmId);
        user.setActiveFarmId(farmId);
        userRepository.save(user);
        log.info("Farm assigned: username={}, farmId={}", username, farmId);
    }

    @Transactional
    public AuthResponse switchFarm(String username, Long farmId) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("Пользователь не найден"));
        if (!user.getFarmIds().contains(farmId)) {
            throw new IllegalArgumentException("Вы не являетесь участником этого хозяйства");
        }
        user.setActiveFarmId(farmId);
        userRepository.save(user);
        String newAccessToken = jwtService.generateToken(user, buildExtraClaims(user));
        return buildAuthResponse(user, newAccessToken, null);
    }

    public UserInfoResponse getCurrentUser(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("Пользователь не найден"));
        return UserInfoResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .role(user.getRole())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .organization(user.getOrganization())
                .phone(user.getPhone())
                .build();
    }

    private AuthResponse buildFullAuthResponse(User user) {
        String accessToken = jwtService.generateToken(user, buildExtraClaims(user));
        String rawRefresh = createRefreshToken(user);
        return buildAuthResponse(user, accessToken, rawRefresh);
    }

    private String createRefreshToken(User user) {
        String raw = UUID.randomUUID().toString();
        RefreshToken token = RefreshToken.builder()
                .token(raw)
                .user(user)
                .expiresAt(LocalDateTime.now().plusDays(refreshExpirationDays))
                .build();
        refreshTokenRepository.save(token);
        return raw;
    }

    private String rotateRefreshToken(RefreshToken old, User user) {
        old.setRevoked(true);
        refreshTokenRepository.save(old);
        return createRefreshToken(user);
    }

    private Map<String, Object> buildExtraClaims(User user) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("role", user.getRole().name());
        claims.put("email", user.getEmail());
        claims.put("userId", user.getId());
        if (user.getActiveFarmId() != null) {
            claims.put("farmId", user.getActiveFarmId());
        }
        claims.put("farmIds", user.getFarmIds());
        return claims;
    }

    private AuthResponse buildAuthResponse(User user, String accessToken, String refreshToken) {
        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .userId(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .role(user.getRole())
                .farmId(user.getActiveFarmId())
                .farmIds(user.getFarmIds())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .organization(user.getOrganization())
                .build();
    }
}
