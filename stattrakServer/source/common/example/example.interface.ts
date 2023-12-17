import { Team } from "./example.enum";

export interface PlayerDeathEvent  {
    assistedflash: boolean;
    assister_name: string;
    assister_steamid: string;
    attacker_name: string;
    attacker_steamid: string;
    attackerblind: boolean;
    distance: number;
    dmg_armor: number;
    dmg_health: number;
    dominated: number;
    event_name: string;
    headshot: boolean;
    hitgroup: number;
    noreplay: boolean;
    noscope: boolean;
    penetrated: number;
    revenge: number;
    thrusmoke: boolean;
    tick: number;
    user_name: string;
    user_steamid: string;
    weapon: string;
    weapon_fauxitemid: string;
    weapon_itemid: string;
    weapon_originalowner_xuid: string;
    wipe: number;
};

export interface RoundEndEvent {
    event_name: string;
    legacy: number;
    message: string;
    nomusic: number;
    player_count: number;
    reason: number;
    tick: number;
    winner: Team;
}

export interface DemoTick {
    name: string,
    steamid: string,
    tick: number
}