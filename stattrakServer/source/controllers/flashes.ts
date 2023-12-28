import { Request, Response } from 'express';
import { parseEvent, parseTicks } from '@laihoe/demoparser2';
import { DemoTick, FlashEvent, PlayerDeathEvent, RoundEndEvent, TeamEvent } from '../common/example/example.interface'
import { Team } from '../common/example/example.enum';

const filePath = "C:\\Users\\jules\\StatTrak\\demos\\nukeDemo.dem";

interface FlashEventWarmup extends FlashEvent {
    attacker_is_warmup_period: boolean,
    is_warmup_period: boolean,
    user_is_warmup_period: boolean,
    user_team_num: number,
    attacker_team_num: number
}

const aggregate = (teamFlashEvents: FlashEventWarmup[]): Map<string, number> => {
    const flashMap = new Map<string, number>();
    teamFlashEvents.forEach(event => {
        if(flashMap.has(event.user_name))
            flashMap.set(event.user_name, flashMap.get(event.user_name)! + 1);
        else
            flashMap.set(event.user_name, 1);
    });
    return flashMap;
}

const getFlashEvents = (): FlashEventWarmup[] => {
    const flashEvents: FlashEventWarmup[] = parseEvent(filePath, "player_blind", ["is_warmup_period", "team_num"])
    .filter((event: FlashEventWarmup) => event.is_warmup_period === false);
    
    return flashEvents;
}

const teamFlashes = async (req: Request, res: Response) => {
    const flashEvents = getFlashEvents();
    const teamFlashEvents = flashEvents.filter(event => event.user_team_num === event.attacker_team_num);

    const flashMap = aggregate(teamFlashEvents);

    return res.status(200).json({
        message: JSON.stringify(Object.fromEntries(flashMap))
    });
}

const cleanFlashes = (req: Request, res: Response) => {
    const flashEvents = getFlashEvents();
    const cleanFlashEvents = flashEvents.filter(event => event.user_team_num !== event.attacker_team_num);
    
    const flashMap = aggregate(cleanFlashEvents);

    return res.status(200).json({
        message: JSON.stringify(Object.fromEntries(flashMap))
    });
}

export default { teamFlashes, cleanFlashes };