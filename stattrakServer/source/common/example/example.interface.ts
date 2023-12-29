import e from "express";
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

export interface TeamEvent {
    disconnect: boolean,
    event_name: string,
    isbot: boolean,
    oldteam: number,
    silent: boolean,
    team: number,
    tick: number,
    user_name: string,
    user_steamid: string
}

export interface FlashEvent { 
    attacker_name: string,
    attacker_steamid: string,
    blind_duration: number,
    entityid: number,
    event_name: string,
    tick: number,
    user_name: string,
    user_steamid: string
}

export interface LeaderBoardRecord {
    user_name: string,
    user_steamid: string,
    user_kills: number,
    total_flashes: number,
    clean_flashes: number,
    team_flashes: number,
    total_flash_time: number,
    clean_flash_time: number,
    team_flash_time: number
}

export interface LeaderBoard {
    playerRecords: LeaderBoardRecord[]
}

export interface FlashStat {
    username: string,
    team_flashes: number,
    clean_flashes: number,
    total_flashes: number,
    clean_flash_time: number,
    team_flash_time: number,
    total_flash_time: number
}