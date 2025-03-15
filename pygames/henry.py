import pygame
import random
import math
import sys

print("Starting program...")

# Initialize Pygame
pygame.init()
print("Pygame initialized")

# Screen settings - Fullscreen
screen = pygame.display.set_mode((0, 0), pygame.FULLSCREEN)
WIDTH = pygame.display.Info().current_w
HEIGHT = pygame.display.Info().current_h
pygame.display.set_caption("Snake.io Tribute")
print("Screen created")

# Colors
WHITE = (255, 255, 255)
RED = (255, 0, 0)
GREEN = (0, 255, 0)
BLUE = (0, 0, 255)
BLACK = (0, 0, 0)

# Snake class (player)
class Snake:
    def __init__(self):
        self.segments = [(WIDTH // 2, HEIGHT // 2)]
        self.radius = 8
        self.speed = 5

    def move(self, target_pos):
        head_x, head_y = self.segments[0]
        target_x, target_y = target_pos
        
        dx = target_x - head_x
        dy = target_y - head_y
        distance = math.sqrt(dx**2 + dy**2)
        
        if distance > 0:
            dx = dx / distance
            dy = dy / distance
            
            new_x = head_x + dx * self.speed
            new_y = head_y + dy * self.speed
            
            if (new_x - self.radius < 0 or new_x + self.radius > WIDTH or 
                new_y - self.radius < 0 or new_y + self.radius > HEIGHT):
                return False
            
            self.segments.insert(0, (new_x, new_y))
            if len(self.segments) > self.radius * 2:
                self.segments.pop()
            return True

    def grow(self, amount=0.5):
        self.radius += amount

    def draw(self):
        for segment in self.segments:
            pygame.draw.circle(screen, GREEN, (int(segment[0]), int(segment[1])), int(self.radius))

    def check_collision(self, pos, radius):
        head_x, head_y = self.segments[0]
        dist = math.sqrt((head_x - pos[0])**2 + (head_y - pos[1])**2)
        return dist < (self.radius + radius)

    def check_body_collision(self, pos, radius):
        for segment in self.segments:
            dist = math.sqrt((segment[0] - pos[0])**2 + (segment[1] - pos[1])**2)
            if dist < (self.radius + radius):
                return True
        return False

# Bot Snake class
class BotSnake:
    def __init__(self):
        self.segments = [(random.randint(0, WIDTH), random.randint(0, HEIGHT))]
        self.radius = 9.5  # Start bigger
        self.speed = 3
        self.direction = random.uniform(0, 2 * math.pi)

    def move(self):
        head_x, head_y = self.segments[0]
        
        new_x = head_x + math.cos(self.direction) * self.speed
        new_y = head_y + math.sin(self.direction) * self.speed
        
        if new_x - self.radius < 0 or new_x + self.radius > WIDTH:
            self.direction = math.pi - self.direction
        if new_y - self.radius < 0 or new_y + self.radius > HEIGHT:
            self.direction = -self.direction
            
        new_x = max(self.radius, min(WIDTH - self.radius, new_x))
        new_y = max(self.radius, min(HEIGHT - self.radius, new_y))
        
        self.segments.insert(0, (new_x, new_y))
        if len(self.segments) > self.radius * 2:
            self.segments.pop()

    def grow(self, amount=0.5):  # Grows same as player from normal dots
        self.radius += amount

    def check_food_collision(self, foods):
        head_x, head_y = self.segments[0]
        for food in foods[:]:
            dist = math.sqrt((head_x - food.x)**2 + (head_y - food.y)**2)
            if dist < (self.radius + food.radius) and food.radius == 4:  # Only normal dots
                foods.remove(food)
                self.grow(0.5)
                foods.append(Food())
                print(f"Bot snake ate food, new radius: {self.radius}")

    def draw(self):
        for segment in self.segments:
            pygame.draw.circle(screen, BLUE, (int(segment[0]), int(segment[1])), int(self.radius))

    def head_position(self):
        return self.segments[0]

# Food class
class Food:
    def __init__(self):
        self.x = random.randint(0, WIDTH)
        self.y = random.randint(0, HEIGHT)
        self.radius = 4

    def draw(self):
        pygame.draw.circle(screen, RED, (int(self.x), int(self.y)), int(self.radius))

# Game setup
snake = Snake()
bot_snakes = [BotSnake() for _ in range(8)]
foods = [Food() for _ in range(50)]  # Increased from 35 to 50
clock = pygame.time.Clock()
running = True
game_started = False
start_time = pygame.time.get_ticks()
grace_period = 10000  # 10 seconds
font = pygame.font.Font(None, 74)
print("Game setup complete")

# Main game loop
print("Entering game loop")
while running:
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False
            print("Quit event received")
        if event.type == pygame.KEYDOWN:
            if event.key == pygame.K_ESCAPE:
                running = False
                print("Escape pressed")

    # Check if grace period is over
    current_time = pygame.time.get_ticks()
    time_elapsed = current_time - start_time
    if time_elapsed >= grace_period:
        game_started = True

    # Only process game logic after grace period
    if game_started:
        # Move player snake
        mouse_pos = pygame.mouse.get_pos()
        if not snake.move(mouse_pos):
            running = False
            print("Wall collision")

        # Move bot snakes and check collisions/growth
        for bot in bot_snakes[:]:
            bot.move()
            bot.check_food_collision(foods)
            
            bot_head = bot.head_position()
            # Bot head hits player body (bot turns into 5 dots)
            if snake.check_body_collision(bot_head, bot.radius):
                for _ in range(5):
                    new_food = Food()
                    new_food.radius = 6
                    new_food.x = bot_head[0] + random.randint(-20, 20)
                    new_food.y = bot_head[1] + random.randint(-20, 20)
                    foods.append(new_food)
                bot_snakes.remove(bot)
                bot_snakes.append(BotSnake())
                print("Bot hit player body")
            
            # Player head hits bot (player dies)
            if snake.check_collision(bot_head, bot.radius):
                running = False
                print("Player hit bot")
                break

        # Check food collision for player
        for food in foods[:]:
            if snake.check_collision((food.x, food.y), food.radius):
                foods.remove(food)
                snake.grow(0.5 if food.radius == 4 else 0.6)
                foods.append(Food())

    # Draw everything
    screen.fill(WHITE)
    
    # Draw countdown during grace period
    if not game_started:
        seconds_left = max(0, (grace_period - time_elapsed) // 1000)
        timer_text = font.render(f"Starting in {seconds_left}", True, BLACK)
        text_rect = timer_text.get_rect(center=(WIDTH // 2, HEIGHT // 2))
        screen.blit(timer_text, text_rect)
    else:
        for food in foods:
            food.draw()
        for bot in bot_snakes:
            bot.draw()
        snake.draw()
    
    pygame.display.flip()
    clock.tick(60)

print("Game loop ended")
pygame.quit()
sys.exit(0)