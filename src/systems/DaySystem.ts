import { STORY_DAYS, StoryDay } from '../data/storyDays';

export class DaySystem {
  private currentDay: number = 1;
  private readonly maxDays: number = 3;

  getCurrentDay(): number {
    return this.currentDay;
  }

  getCurrentStory(): StoryDay {
    return STORY_DAYS[this.currentDay - 1];
  }

  advanceDay(): boolean {
    if (this.currentDay < this.maxDays) {
      this.currentDay++;
      return true;
    }
    return false;
  }

  isFinalDay(): boolean {
    return this.currentDay === this.maxDays;
  }
}
