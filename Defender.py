import pygame
import os
import random

pygame.font.init()
pygame.mixer.init()

WIDTH, HEIGHT = 750, 750
WIN = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("Defender")

RED_ENEMY = pygame.image.load(os.path.join("assets", "pixel_tank_red.png"))
GREEN_ENEMY = pygame.image.load(os.path.join("assets", "pixel_bmp_green_small.png"))
BLUE_ENEMY = pygame.image.load(os.path.join("assets", "pixel_zombies_blue_small.png"))
icon = pygame.image.load('assets/icon.jpg')
health = pygame.image.load("assets/health.png").convert()
upgrade_img = pygame.image.load("assets/upgrade.png").convert()
pygame.display.set_icon(icon)

YELLOW_LEOPARD = pygame.image.load(os.path.join("assets", "pixel_tank_green.png"))

RED_MISSILE = pygame.image.load(os.path.join("assets", "pixel_laser_red.png"))
GREEN_MISSILE = pygame.image.load(os.path.join("assets", "pixel_laser_green.png"))
BLUE_MISSILE = pygame.image.load(os.path.join("assets", "pixel_laser_blue.png"))
YELLOW_MISSILE = pygame.image.load(os.path.join("assets", "pixel_laser_yellow.png"))

black_bg = pygame.transform.scale(pygame.image.load(os.path.join("assets", "background-black.png")).convert(),
                                  (WIDTH, HEIGHT))
title_bg = pygame.transform.scale(pygame.image.load(os.path.join("assets", "background-title.png")).convert(),
                                  (WIDTH, HEIGHT))
snow_bg = pygame.transform.scale(pygame.image.load(os.path.join("assets", "background-snow.png")).convert(),
                                 (WIDTH, HEIGHT))
mud_bg = pygame.transform.scale(pygame.image.load(os.path.join("assets", "background-mud.png")).convert(),
                                (WIDTH, HEIGHT))
field_bg = pygame.transform.scale(pygame.image.load(os.path.join("assets", "background-field.png")).convert(),
                                  (WIDTH, HEIGHT))
victory_bg = pygame.transform.scale(pygame.image.load(os.path.join("assets", "victory_bg.png")).convert(),
                                    (WIDTH, HEIGHT))
ammo_out_sound = pygame.mixer.Sound("assets/ammo out.mp3")
ammo_sound = pygame.mixer.Sound("assets/ammo.mp3")
health_sound = pygame.mixer.Sound("assets/health.mp3")
clear_sound = pygame.mixer.Sound("assets/clear.mp3")
shoot_sound = pygame.mixer.Sound("assets/fire.mp3")
explosion_sound = pygame.mixer.Sound("assets/explosion.mp3")
level_up_sound = pygame.mixer.Sound("assets/level up.mp3")
damaged_sound = pygame.mixer.Sound("assets/damage.mp3")
death_sound = pygame.mixer.Sound("assets/death.mp3")
pygame.mixer.music.load("assets/Alpha Mission - Jimena Contreras.mp3")
# pygame.mixer.music.load("assets/idle.mp3")


class Missile:
    def __init__(self, x, y, img):
        self.x = x
        self.y = y
        self.img = img
        self.mask = pygame.mask.from_surface(self.img)

    def draw(self, window):
        window.blit(self.img, (self.x, self.y))

    def move(self, vel):
        self.y += vel

    def off_screen(self, height):
        return not (self.y <= height and self.y >= 0)

    def collision(self, obj):
        return collide(obj, self)


class Vehicle:
    COOLDOWN = 15

    def __init__(self, x, y, health=100):
        self.x = x
        self.y = y
        self.health = health
        self.ship_img = None
        self.laser_img = None
        self.lasers = []
        self.cool_down_counter = 0

    def draw(self, window):
        window.blit(self.ship_img, (self.x, self.y))
        for laser in self.lasers:
            laser.draw(window)

    def move_lasers(self, vel, obj):
        self.cooldown()
        for laser in self.lasers:
            laser.move(vel)
            if laser.off_screen(HEIGHT):
                self.lasers.remove(laser)
            elif laser.collision(obj):
                obj.health -= 10
                self.lasers.remove(laser)

    def cooldown(self):
        if self.cool_down_counter >= self.COOLDOWN:
            self.cool_down_counter = 0
        elif self.cool_down_counter > 0:
            self.cool_down_counter += 1

    def shoot(self):
        if self.cool_down_counter == 0:
            laser = Missile(self.x, self.y, self.laser_img)
            self.lasers.append(laser)
            self.cool_down_counter = 1
            shoot_sound.play()

    def get_width(self):
        return self.ship_img.get_width()

    def get_height(self):
        return self.ship_img.get_height()


class Player(Vehicle):
    def __init__(self, x, y, health=100):
        super().__init__(x, y, health)
        self.ship_img = YELLOW_LEOPARD
        self.laser_img = YELLOW_MISSILE
        self.mask = pygame.mask.from_surface(self.ship_img)
        self.max_health = health

    def move_lasers(self, vel, objs):
        self.cooldown()
        for laser in self.lasers:
            laser.move(vel)
            if laser.off_screen(HEIGHT):
                self.lasers.remove(laser)
            else:
                for obj in objs:
                    if laser.collision(obj):
                        objs.remove(obj)
                        if laser in self.lasers:
                            self.lasers.remove(laser)

    def draw(self, window):
        super().draw(window)
        self.healthbar(window)

    def healthbar(self, window):
        pygame.draw.rect(window, (255, 0, 0),
                         (self.x, self.y + self.ship_img.get_height() + 10, self.ship_img.get_width(), 10))
        pygame.draw.rect(window, (0, 255, 0),
                         (self.x, self.y + self.ship_img.get_height() + 10, self.ship_img.get_width() *
                          (self.health / self.max_health), 10))

    def move(self, vel):  # Moves player up
        self.y -= vel


class Enemy(Vehicle):
    COLOR_MAP = {
        "red": (RED_ENEMY, RED_MISSILE),
        "green": (GREEN_ENEMY, GREEN_MISSILE),
        "blue": (BLUE_ENEMY, BLUE_MISSILE)
    }

    def __init__(self, x, y, colour, health=100):
        super().__init__(x, y, health)
        self.ship_img, self.laser_img = self.COLOR_MAP[colour]  # Pulls colours from colourmap dictionary
        self.mask = pygame.mask.from_surface(self.ship_img)

    def move(self, vel):  # Moves enemy ships down
        self.y += vel

    def shoot(self):
        if self.cool_down_counter == 0:
            laser = Missile(self.x - 20, self.y, self.laser_img)
            self.lasers.append(laser)
            self.cool_down_counter = 1


class Pickup:
    def __init__(self, x, y):
        self.x = x
        self.y = y
        self.health_img = health
        self.mask = pygame.mask.from_surface(self.health_img)

    def move(self, vel):
        self.y += vel / 2

    def draw(self, window):
        window.blit(self.health_img, (self.x, self.y))

    def get_height(self):
        return self.health_img.get_height()


class Upgrade:
    def __init__(self, x, y):
        self.x = x
        self.y = y
        self.upgrade_img = upgrade_img
        self.mask = pygame.mask.from_surface(self.upgrade_img)

    def move(self, vel):
        self.y += vel / 2

    def draw(self, window):
        window.blit(self.upgrade_img, (self.x, self.y))

    def get_height(self):
        return self.upgrade_img.get_height()


def collide(obj1, obj2):
    offset_x = obj2.x - obj1.x
    offset_y = obj2.y - obj1.y
    return obj1.mask.overlap(obj2.mask, (offset_x, offset_y)) != None  # if true returns x, y


def level_1():
    pygame.mixer.music.play(loops=-1)
    current_bg = field_bg
    run = True
    FPS = 60
    waves = 5
    line = 5
    pickups = []
    upgrades = []
    main_font = pygame.font.SysFont("impact", 50)
    lost_font = pygame.font.SysFont("impact", 60)
    enemies = []
    wave_length = 5
    enemy_vel = 1.5
    player_vel = 5
    laser_vel = 20
    clear_sound_played = 0
    player = Player(300, 630)

    clock = pygame.time.Clock()

    lost = False
    lost_count = 0
    clear_count = 0

    def redraw_window():
        WIN.blit(current_bg, (0, 0))
        line_label = main_font.render(f"Line: {line}", 1, (255, 255, 255))
        level_label = main_font.render(f"Waves: {waves}", 1, (255, 255, 255))

        for enemy in enemies:
            enemy.draw(WIN)

        for pickup in pickups:
            pickup.draw(WIN)

        for upgrade in upgrades:
            upgrade.draw(WIN)

        player.draw(WIN)

        WIN.blit(line_label, (10, 10))
        WIN.blit(level_label, (WIDTH - level_label.get_width() - 10, 10))

        if lost:
            lost_label = lost_font.render("Fall back!", 1, (255, 255, 255))
            ammo_out_sound.play()
            WIN.blit(lost_label, (WIDTH / 2 - lost_label.get_width() / 2, 350))  # Puts text in the center of the screen

        pygame.display.update()

    while run:
        combat = True
        clock.tick(FPS)

        redraw_window()

        if line <= 0 or player.health <= 0:
            lost = True
            lost_count += 1

        if lost:
            if lost_count > FPS * 3:
                main_menu()
            else:
                continue

        if waves == 0 and clear_sound_played == 0:
            pygame.mixer.music.stop()
            clear_sound_played = 1
            clear_sound.play(0)

        if waves == 0:
            combat = False
            between = False
            clear_count += 1
            if clear_count > FPS * 3:
                between = True
            while between:
                current_bg = black_bg
                proceed_label = lost_font.render("Proceed to next combat zone", 1, (255, 255, 255))
                proceed_label_next_stage = lost_font.render('level 2 "Mud"', 1, (255, 255, 255))
                WIN.blit(current_bg, (0, 0))
                WIN.blit(proceed_label, (WIDTH / 2 - proceed_label.get_width() / 2, 150))
                WIN.blit(proceed_label_next_stage, (WIDTH / 2 - proceed_label_next_stage.get_width() / 2, 210))
                pygame.display.update()
                for event in pygame.event.get():
                    if event.type == pygame.QUIT:
                        run = False
                    if event.type == pygame.MOUSEBUTTONDOWN:
                        current_bg = mud_bg
                        level_2()

        if waves <= 4 and len(enemies) == 0:
            pickup = Pickup(random.randrange(50, WIDTH - 100),  random.randrange(-1500, -100))
            pickups.append(pickup)

        if waves == 3 and len(enemies) == 0:
            upgrade = Upgrade(random.randrange(50, WIDTH - 100),  random.randrange(-1500, -100))
            upgrades.append(upgrade)

        if len(enemies) == 0 and combat:
            waves -= 1
            level_up_sound.play()
            wave_length += 3  # Adds 5 more enemies to the next wave
            for i in range(wave_length):  # Spawns enemies at random negative y locations
                enemy = Enemy(random.randrange(50, WIDTH - 100), random.randrange(-1500, -100),
                              random.choice(["blue", "green"]))
                enemies.append(enemy)

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                quit()

        if combat:
            keys = pygame.key.get_pressed()  # Controls for player movement
            if keys[pygame.K_LEFT] and player.x - player_vel > 0:  # Left
                player.x -= player_vel
                player.ship_img = pygame.image.load(os.path.join("assets", "pixel_tank_green_left.png"))
            if keys[pygame.K_RIGHT] and player.x + player_vel + player.get_width() < WIDTH:  # Right
                player.x += player_vel
                player.ship_img = pygame.image.load(os.path.join("assets", "pixel_tank_green_right.png"))
            if keys[pygame.K_UP] and player.y - player_vel > 0:  # Up
                player.y -= player_vel
                player.ship_img = pygame.image.load(os.path.join("assets", "pixel_tank_green.png"))
            if keys[pygame.K_DOWN] and player.y + player_vel + player.get_height() + 15 < HEIGHT:  # Down
                player.y += player_vel
                player.ship_img = pygame.image.load(os.path.join("assets", "pixel_tank_green.png"))
            if keys[pygame.K_DOWN] and keys[pygame.K_RIGHT]:
                player.ship_img = pygame.image.load(os.path.join("assets", "pixel_tank_green_upleft.png"))
            if keys[pygame.K_UP] and keys[pygame.K_LEFT]:
                player.ship_img = pygame.image.load(os.path.join("assets", "pixel_tank_green_upleft.png"))
            if keys[pygame.K_DOWN] and keys[pygame.K_LEFT]:
                player.ship_img = pygame.image.load(os.path.join("assets", "pixel_tank_green_upright.png"))
            if keys[pygame.K_UP] and keys[pygame.K_RIGHT]:
                player.ship_img = pygame.image.load(os.path.join("assets", "pixel_tank_green_upright.png"))

            if keys[pygame.K_SPACE]:
                player.shoot()

            for enemy in enemies[:]:  # Moves enemies down, removes lives, and removes enemies that pass screen
                enemy.move(enemy_vel)
                enemy.move_lasers(laser_vel, player)

                if random.randrange(0, 2 * 60) == 1:
                    enemy.shoot()
                if collide(enemy, player):
                    player.health -= 10
                    enemies.remove(enemy)
                    damaged_sound.play()
                    death_sound.play()
                if enemy.y + enemy.get_height() > HEIGHT:
                    line -= 1
                    enemies.remove(enemy)
                for laser in player.lasers:
                    if laser.collision(enemy):
                        explosion_sound.play()
                        enemies.remove(enemy)

            for pickup in pickups[:]:
                pickup.move(enemy_vel)

                if collide(pickup, player):
                    player.health = player.max_health
                    pickups.remove(pickup)
                    health_sound.play()
                elif pickup.y + pickup.get_height() > HEIGHT:
                    line += 1
                    pickups.remove(pickup)

            for upgrade in upgrades[:]:
                upgrade.move(enemy_vel)

                if collide(upgrade, player):
                    player.max_health += 50
                    player.health += player.health / 2
                    upgrades.remove(upgrade)
                    ammo_sound.play()
                elif upgrade.y + upgrade.get_height() > HEIGHT:
                    line += 1
                    upgrades.remove(upgrade)

            player.move_lasers(-laser_vel, enemies)


def level_2():
    pygame.mixer.music.play(loops=-1)
    current_bg = mud_bg
    run = True
    FPS = 60
    waves = 7
    line = 5
    pickups = []
    upgrades = []
    main_font = pygame.font.SysFont("impact", 50)
    lost_font = pygame.font.SysFont("impact", 60)

    enemies = []
    wave_length = 6
    enemy_vel = 1
    player_vel = 4
    laser_vel = 20
    clear_sound_played = 0
    player = Player(300, 630)

    clock = pygame.time.Clock()

    lost = False
    lost_count = 0
    clear_count = 0

    def redraw_window():
        WIN.blit(current_bg, (0, 0))
        line_label = main_font.render(f"Line: {line}", 1, (255, 255, 255))
        level_label = main_font.render(f"Waves: {waves}", 1, (255, 255, 255))

        for enemy in enemies:
            enemy.draw(WIN)
        WIN.blit(line_label, (10, 10))
        WIN.blit(level_label, (WIDTH - level_label.get_width() - 10, 10))

        for pickup in pickups:
            pickup.draw(WIN)

        for upgrade in upgrades:
            upgrade.draw(WIN)

        player.draw(WIN)

        if lost:
            lost_label = lost_font.render("Fall back!", 1, (255, 255, 255))
            ammo_out_sound.play()
            WIN.blit(lost_label, (WIDTH / 2 - lost_label.get_width() / 2, 350))  # Puts text in the center of the screen

        pygame.display.update()

    while run:
        combat = True
        clock.tick(FPS)

        redraw_window()

        if line <= 0 or player.health <= 0:
            lost = True
            lost_count += 1

        if lost:
            if lost_count > FPS * 3:
                main_menu()
            else:
                continue

        if waves == 0 and clear_sound_played == 0:
            pygame.mixer.music.stop()
            clear_sound_played = 1
            clear_sound.play(0)

        if waves == 0:
            combat = False
            between = False
            clear_count += 1
            if clear_count > FPS * 3:
                between = True
            while between:
                current_bg = black_bg
                proceed_label = lost_font.render("Proceed to next combat zone", 1, (255, 255, 255))
                proceed_label_next_stage = lost_font.render('level 3 "Snow"', 1, (255, 255, 255))
                WIN.blit(current_bg, (0, 0))
                WIN.blit(proceed_label, (WIDTH / 2 - proceed_label.get_width() / 2, 150))
                WIN.blit(proceed_label_next_stage, (WIDTH / 2 - proceed_label_next_stage.get_width() / 2, 210))
                pygame.display.update()
                for event in pygame.event.get():
                    if event.type == pygame.QUIT:
                        run = False
                    if event.type == pygame.MOUSEBUTTONDOWN:
                        current_bg = snow_bg
                        level_3()

        if waves <= 10 and len(enemies) == 0:
            pickup = Pickup(random.randrange(50, WIDTH - 100),  random.randrange(-1500, -100))
            pickups.append(pickup)

        if waves == 4 and len(enemies) == 0:
            upgrade = Upgrade(random.randrange(50, WIDTH - 100),  random.randrange(-1500, -100))
            upgrades.append(upgrade)

        if waves == 7 and len(enemies) == 0:
            upgrade = Upgrade(random.randrange(50, WIDTH - 100),  random.randrange(-1500, -100))
            upgrades.append(upgrade)

        if len(enemies) == 0 and combat:
            waves -= 1
            level_up_sound.play()
            wave_length += 3  # Adds 5 more enemies to the next wave
            for i in range(wave_length):  # Spawns enemies at random negative y locations
                enemy = Enemy(random.randrange(50, WIDTH - 100), random.randrange(-1500, -100),
                              random.choice(["red", "green"]))
                enemies.append(enemy)

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                quit()

        if combat:
            keys = pygame.key.get_pressed()  # Controls for player movement
            if keys[pygame.K_LEFT] and player.x - player_vel > 0:  # Left
                player.x -= player_vel
                player.ship_img = pygame.image.load(os.path.join("assets", "pixel_tank_green_left.png"))
            if keys[pygame.K_RIGHT] and player.x + player_vel + player.get_width() < WIDTH:  # Right
                player.x += player_vel
                player.ship_img = pygame.image.load(os.path.join("assets", "pixel_tank_green_right.png"))
            if keys[pygame.K_UP] and player.y - player_vel > 0:  # Up
                player.y -= player_vel
                player.ship_img = pygame.image.load(os.path.join("assets", "pixel_tank_green.png"))
            if keys[pygame.K_DOWN] and player.y + player_vel + player.get_height() + 15 < HEIGHT:  # Down
                player.y += player_vel
                player.ship_img = pygame.image.load(os.path.join("assets", "pixel_tank_green.png"))
            if keys[pygame.K_DOWN] and keys[pygame.K_RIGHT]:
                player.ship_img = pygame.image.load(os.path.join("assets", "pixel_tank_green_upleft.png"))
            if keys[pygame.K_UP] and keys[pygame.K_LEFT]:
                player.ship_img = pygame.image.load(os.path.join("assets", "pixel_tank_green_upleft.png"))
            if keys[pygame.K_DOWN] and keys[pygame.K_LEFT]:
                player.ship_img = pygame.image.load(os.path.join("assets", "pixel_tank_green_upright.png"))
            if keys[pygame.K_UP] and keys[pygame.K_RIGHT]:
                player.ship_img = pygame.image.load(os.path.join("assets", "pixel_tank_green_upright.png"))

            if keys[pygame.K_SPACE]:
                player.shoot()

            for enemy in enemies[:]:  # Moves enemies down, removes lives, and removes enemies that pass screen
                enemy.move(enemy_vel)
                enemy.move_lasers(laser_vel, player)

                if random.randrange(0, 2 * 60) == 1:
                    enemy.shoot()
                if collide(enemy, player):
                    player.health -= 10
                    enemies.remove(enemy)
                    damaged_sound.play()
                    death_sound.play()
                if enemy.y + enemy.get_height() > HEIGHT:
                    line -= 1
                    enemies.remove(enemy)
                for laser in player.lasers:
                    if laser.collision(enemy):
                        enemies.remove(enemy)
                        explosion_sound.play()

            for pickup in pickups[:]:
                pickup.move(enemy_vel)

                if collide(pickup, player):
                    player.health = player.max_health
                    pickups.remove(pickup)
                    health_sound.play()
                elif pickup.y + pickup.get_height() > HEIGHT:
                    line += 1
                    pickups.remove(pickup)

            for upgrade in upgrades[:]:
                upgrade.move(enemy_vel)

                if collide(upgrade, player):
                    player.max_health += 50
                    player.health += player.health / 2
                    upgrades.remove(upgrade)
                    ammo_sound.play()
                elif upgrade.y + upgrade.get_height() > HEIGHT:
                    line += 1
                    upgrades.remove(upgrade)

            player.move_lasers(-laser_vel, enemies)


def level_3():
    pygame.mixer.music.play(loops=-1)
    current_bg = snow_bg
    run = True
    FPS = 60
    waves = 9
    line = 5
    pickups = []
    upgrades = []
    main_font = pygame.font.SysFont("impact", 50)
    lost_font = pygame.font.SysFont("impact", 60)

    enemies = []
    wave_length = 6
    enemy_vel = 1.5
    player_vel = 5
    laser_vel = 20
    clear_sound_played = 0
    player = Player(300, 630)

    clock = pygame.time.Clock()

    lost = False
    lost_count = 0
    clear_count = 0

    def redraw_window():
        WIN.blit(current_bg, (0, 0))
        line_label = main_font.render(f"Line: {line}", 1, (255, 255, 255))
        level_label = main_font.render(f"Waves: {waves}", 1, (255, 255, 255))

        for enemy in enemies:
            enemy.draw(WIN)
        WIN.blit(line_label, (10, 10))
        WIN.blit(level_label, (WIDTH - level_label.get_width() - 10, 10))

        for pickup in pickups:
            pickup.draw(WIN)

        for upgrade in upgrades:
            upgrade.draw(WIN)

        player.draw(WIN)

        if lost:
            lost_label = lost_font.render("Fall back!", 1, (255, 255, 255))
            ammo_out_sound.play()
            WIN.blit(lost_label, (WIDTH / 2 - lost_label.get_width() / 2, 350))  # Puts text in the center of the screen

        pygame.display.update()

    while run:
        combat = True
        clock.tick(FPS)

        redraw_window()

        if line <= 0 or player.health <= 0:
            lost = True
            lost_count += 1

        if lost:
            if lost_count > FPS * 3:
                main_menu()
            else:
                continue

        if waves == 0 and clear_sound_played == 0:
            pygame.mixer.music.stop()
            clear_sound_played = 1
            clear_sound.play(0)

        if waves == 0:
            combat = False
            between = False
            clear_count += 1
            if clear_count > FPS * 3:
                between = True
            while between:
                current_bg = victory_bg
                proceed_label = lost_font.render("Congratulations! You win!", 1, (255, 255, 255))
                WIN.blit(current_bg, (0, 0))
                WIN.blit(proceed_label, (WIDTH / 2 - proceed_label.get_width() / 2, 150))
                pygame.display.update()
                for event in pygame.event.get():
                    if event.type == pygame.QUIT:
                        run = False
                    if event.type == pygame.MOUSEBUTTONDOWN:
                        main_menu()

        if waves >= 2 and len(enemies) == 0:
            pickup = Pickup(random.randrange(50, WIDTH - 100),  random.randrange(-1500, -100))
            pickups.append(pickup)

        if waves == 3 and len(enemies) == 0:
            upgrade = Upgrade(random.randrange(50, WIDTH - 100), random.randrange(-1500, -100))
            upgrades.append(upgrade)

        if waves == 5 and len(enemies) == 0:
            upgrade = Upgrade(random.randrange(50, WIDTH - 100), random.randrange(-1500, -100))
            upgrades.append(upgrade)

        if waves == 7 and len(enemies) == 0:
            upgrade = Upgrade(random.randrange(50, WIDTH - 100),  random.randrange(-1500, -100))
            upgrades.append(upgrade)

        if len(enemies) == 0 and combat:
            waves -= 1
            level_up_sound.play()
            wave_length += 5  # Adds 5 more enemies to the next wave
            for i in range(wave_length):  # Spawns enemies at random negative y locations
                enemy = Enemy(random.randrange(50, WIDTH - 100), random.randrange(-1500, -100),
                              random.choice(["red", "blue", "green"]))
                enemies.append(enemy)

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                quit()

        if combat:
            keys = pygame.key.get_pressed()  # Controls for player movement
            if keys[pygame.K_LEFT] and player.x - player_vel > 0:  # Left
                player.x -= player_vel
                player.ship_img = pygame.image.load(os.path.join("assets", "pixel_tank_green_left.png"))
            if keys[pygame.K_RIGHT] and player.x + player_vel + player.get_width() < WIDTH:  # Right
                player.x += player_vel
                player.ship_img = pygame.image.load(os.path.join("assets", "pixel_tank_green_right.png"))
            if keys[pygame.K_UP] and player.y - player_vel > 0:  # Up
                player.y -= player_vel
                player.ship_img = pygame.image.load(os.path.join("assets", "pixel_tank_green.png"))
            if keys[pygame.K_DOWN] and player.y + player_vel + player.get_height() + 15 < HEIGHT:  # Down
                player.y += player_vel
                player.ship_img = pygame.image.load(os.path.join("assets", "pixel_tank_green.png"))
            if keys[pygame.K_DOWN] and keys[pygame.K_RIGHT]:
                player.ship_img = pygame.image.load(os.path.join("assets", "pixel_tank_green_upleft.png"))
            if keys[pygame.K_UP] and keys[pygame.K_LEFT]:
                player.ship_img = pygame.image.load(os.path.join("assets", "pixel_tank_green_upleft.png"))
            if keys[pygame.K_DOWN] and keys[pygame.K_LEFT]:
                player.ship_img = pygame.image.load(os.path.join("assets", "pixel_tank_green_upright.png"))
            if keys[pygame.K_UP] and keys[pygame.K_RIGHT]:
                player.ship_img = pygame.image.load(os.path.join("assets", "pixel_tank_green_upright.png"))

            if keys[pygame.K_SPACE]:
                player.shoot()

            for enemy in enemies[:]:  # Moves enemies down, removes lives, and removes enemies that pass screen
                enemy.move(enemy_vel)
                enemy.move_lasers(laser_vel, player)

                if random.randrange(0, 2 * 60) == 1:
                    enemy.shoot()
                if collide(enemy, player):
                    player.health -= 10
                    enemies.remove(enemy)
                    damaged_sound.play()
                    death_sound.play()
                if enemy.y + enemy.get_height() > HEIGHT:
                    line -= 1
                    enemies.remove(enemy)
                for laser in player.lasers:
                    if laser.collision(enemy):
                        enemies.remove(enemy)
                        explosion_sound.play()

            for pickup in pickups[:]:
                pickup.move(enemy_vel)

                if collide(pickup, player):
                    player.health = player.max_health
                    pickups.remove(pickup)
                    health_sound.play()
                elif pickup.y + pickup.get_height() > HEIGHT:
                    line += 1
                    pickups.remove(pickup)

            for upgrade in upgrades[:]:
                upgrade.move(enemy_vel)

                if collide(upgrade, player):
                    player.max_health += 50
                    player.health += player.health / 2
                    upgrades.remove(upgrade)
                    ammo_sound.play()
                elif upgrade.y + upgrade.get_height() > HEIGHT:
                    line += 1
                    upgrades.remove(upgrade)

            player.move_lasers(-laser_vel, enemies)


def main_menu():
    title_font = pygame.font.SysFont("impact", 40)
    run = True
    between = False
    while run:
        WIN.blit(title_bg, (0, 0))
        title_label = title_font.render("Press mouse button to Start", 1, (255, 255, 255))
        WIN.blit(title_label, (WIDTH / 2 - title_label.get_width() / 2, 250))
        pygame.display.update()

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                run = False
            if event.type == pygame.MOUSEBUTTONDOWN:
                level_1()
    pygame.quit()


main_menu()
