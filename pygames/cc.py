import pygame
import random
import os

# Initialize Pygame
pygame.init()

# Constants
WINDOW_SIZE = 600
GRID_SIZE = 8
CELL_SIZE = WINDOW_SIZE // GRID_SIZE
FALL_SPEED = 5
POP_DURATION = 20

# Load breakfast images (selecting 6 for variety, adjust as needed)
IMAGE_DIR = ".\\breakfastcrush\\images"
IMAGE_FILES = [
    "Coffee.png",
    "Egg.png",
    "Bagel.png",
    "Milk.png",
    "Bread.png",
    "Fried Egg.png"
]
IMAGES = [pygame.transform.scale(pygame.image.load(os.path.join(IMAGE_DIR, img)), (CELL_SIZE - 10, CELL_SIZE - 10))
          for img in IMAGE_FILES]

# Set up display
screen = pygame.display.set_mode((WINDOW_SIZE, WINDOW_SIZE))
pygame.display.set_caption("Breakfast Crush")
clock = pygame.time.Clock()

class Candy:
    def __init__(self, img_idx, x, y):
        self.img_idx = img_idx  # Index into IMAGES list instead of color_idx
        self.x = x
        self.y = y
        self.target_y = y
        self.scale = 1.0
        self.scale_speed = 0
        self.popping = False
        self.pop_timer = 0
        self.alpha = 255

class Game:
    def __init__(self):
        self.grid = [[Candy(random.randint(0, len(IMAGES)-1), x*CELL_SIZE, y*CELL_SIZE) 
                     for x in range(GRID_SIZE)] 
                     for y in range(GRID_SIZE)]
        self.selected = None
        self.score = 0
        self.font = pygame.font.Font(None, 36)

    def draw(self):
        screen.fill((50, 50, 50))
        candy_surface = pygame.Surface((WINDOW_SIZE, WINDOW_SIZE), pygame.SRCALPHA)
        
        for y in range(GRID_SIZE):
            for x in range(GRID_SIZE):
                if self.grid[y][x]:
                    candy = self.grid[y][x]
                    img = IMAGES[candy.img_idx].copy()  # Create a copy to modify
                    if candy.popping:
                        img.set_alpha(candy.alpha)
                    else:
                        img.set_alpha(255)
                    
                    # Scale the image based on candy.scale
                    scaled_size = (int((CELL_SIZE - 10) * candy.scale), int((CELL_SIZE - 10) * candy.scale))
                    scaled_img = pygame.transform.scale(img, scaled_size)
                    
                    # Calculate position to center the scaled image
                    pos_x = candy.x + (CELL_SIZE - scaled_size[0]) // 2
                    pos_y = candy.y + (CELL_SIZE - scaled_size[1]) // 2
                    
                    candy_surface.blit(scaled_img, (pos_x, pos_y))
                    # Draw a border
                    #pygame.draw.rect(candy_surface, (0, 0, 0, candy.alpha),
                    #               (pos_x, pos_y, scaled_size[0], scaled_size[1]), 2)

        screen.blit(candy_surface, (0, 0))
        if self.selected:
            x, y = self.selected
            pygame.draw.rect(screen, (0, 0, 0),
                           (x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE), 3)
        score_text = self.font.render(f"Score: {self.score}", True, (255, 255, 255))
        screen.blit(score_text, (10, 10))

    def update_animations(self):
        for y in range(GRID_SIZE):
            for x in range(GRID_SIZE):
                if self.grid[y][x]:
                    candy = self.grid[y][x]
                    if candy.popping:
                        candy.pop_timer += 1
                        candy.scale += 0.05
                        candy.alpha = max(0, 255 - (255 * candy.pop_timer // POP_DURATION))
                        if candy.pop_timer >= POP_DURATION:
                            self.grid[y][x] = None
                    else:
                        if candy.y < candy.target_y:
                            candy.y = min(candy.y + FALL_SPEED, candy.target_y)
                        if candy.scale_speed != 0:
                            candy.scale += candy.scale_speed
                            if candy.scale > 1.1 or candy.scale < 0.9:
                                candy.scale_speed = -candy.scale_speed
                            if abs(candy.scale - 1.0) < 0.05:
                                candy.scale = 1.0
                                candy.scale_speed = 0

    def get_cell(self, pos):
        x, y = pos
        return x // CELL_SIZE, y // CELL_SIZE

    def swap(self, pos1, pos2):
        x1, y1 = pos1
        x2, y2 = pos2
        if self.grid[y1][x1] and self.grid[y2][x2]:
            self.grid[y1][x1], self.grid[y2][x2] = self.grid[y2][x2], self.grid[y1][x1]
            self.grid[y1][x1].target_y = y1 * CELL_SIZE
            self.grid[y1][x1].x = x1 * CELL_SIZE
            self.grid[y2][x2].target_y = y2 * CELL_SIZE
            self.grid[y2][x2].x = x2 * CELL_SIZE
            self.grid[y1][x1].scale_speed = 0.05
            self.grid[y2][x2].scale_speed = 0.05

    def check_matches(self):
        matches = set()
        for y in range(GRID_SIZE):
            for x in range(GRID_SIZE-2):
                if (self.grid[y][x] and self.grid[y][x+1] and self.grid[y][x+2] and
                    not self.grid[y][x].popping and not self.grid[y][x+1].popping and not self.grid[y][x+2].popping and
                    self.grid[y][x].img_idx == self.grid[y][x+1].img_idx == self.grid[y][x+2].img_idx):
                    matches.update([(x, y), (x+1, y), (x+2, y)])

        for y in range(GRID_SIZE-2):
            for x in range(GRID_SIZE):
                if (self.grid[y][x] and self.grid[y+1][x] and self.grid[y+2][x] and
                    not self.grid[y][x].popping and not self.grid[y+1][x].popping and not self.grid[y+2][x].popping and
                    self.grid[y][x].img_idx == self.grid[y+1][x].img_idx == self.grid[y+2][x].img_idx):
                    matches.update([(x, y), (x, y+1), (x, y+2)])

        return matches

    def start_popping(self, matches):
        for x, y in matches:
            if self.grid[y][x]:
                self.grid[y][x].popping = True
                self.grid[y][x].pop_timer = 0
        self.score += len(matches) * 10

    def apply_gravity(self):
        for x in range(GRID_SIZE):
            for y in range(GRID_SIZE-1, -1, -1):
                if not self.grid[y][x]:
                    for y_above in range(y-1, -1, -1):
                        if self.grid[y_above][x] and not self.grid[y_above][x].popping:
                            self.grid[y][x] = self.grid[y_above][x]
                            self.grid[y_above][x] = None
                            self.grid[y][x].target_y = y * CELL_SIZE
                            self.grid[y][x].x = x * CELL_SIZE
                            break
            for y in range(GRID_SIZE):
                if not self.grid[y][x]:
                    self.grid[y][x] = Candy(random.randint(0, len(IMAGES)-1),
                                         x * CELL_SIZE,
                                         -CELL_SIZE)
                    self.grid[y][x].target_y = y * CELL_SIZE

    def is_animating(self):
        return any(candy and (candy.y != candy.target_y or candy.popping) 
                  for row in self.grid for candy in row)

    def check_rendering(self):
        for y in range(GRID_SIZE):
            for x in range(GRID_SIZE):
                if self.grid[y][x]:
                    candy = self.grid[y][x]
                    if (candy.x < 0 or candy.x >= WINDOW_SIZE or 
                        candy.y < -CELL_SIZE or candy.y >= WINDOW_SIZE):
                        print(f"Rendering error at ({x}, {y}): x={candy.x}, y={candy.y}")
                        return False
        return True

def main():
    game = Game()
    running = True

    while running:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.MOUSEBUTTONDOWN and not game.is_animating():
                pos = game.get_cell(event.pos)
                if game.selected:
                    sel_x, sel_y = game.selected
                    new_x, new_y = pos
                    if (abs(sel_x - new_x) + abs(sel_y - new_y) == 1):
                        if (0 <= sel_y < GRID_SIZE and 0 <= sel_x < GRID_SIZE and
                            0 <= new_y < GRID_SIZE and 0 <= new_x < GRID_SIZE and
                            game.grid[sel_y][sel_x] and game.grid[new_y][new_x]):
                            game.swap(game.selected, pos)
                            matches = game.check_matches()
                            if matches:
                                game.start_popping(matches)
                            else:
                                game.swap(pos, game.selected)
                    game.selected = None
                else:
                    x, y = pos
                    if 0 <= x < GRID_SIZE and 0 <= y < GRID_SIZE and game.grid[y][x]:
                        game.selected = pos

        game.update_animations()
        if not any(candy and candy.popping for row in game.grid for candy in row):
            matches = game.check_matches()
            if matches:
                game.start_popping(matches)
            else:
                game.apply_gravity()

        game.draw()
        if not game.check_rendering():
            print("Rendering verification failed!")
        pygame.display.flip()
        clock.tick(60)

    pygame.quit()

if __name__ == "__main__":
    main()
