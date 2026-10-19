export interface MyPetPlayer {
  internal_uuid: string;
  mojang_uuid: string;
  name: string;
  auto_respawn: number;
  auto_respawn_min: number;
  capture_mode: number;
  health_bar: number;
  pet_idle_volume: number;
  multi_world: string;
  last_update: Date;
}

export interface MyPetPet {
  uuid: string;
  owner_uuid: string;
  name: string;
  type: string;
  exp: number;
  health: number;
  hunger: number;
  respawn_time: number;
  world_group: string;
  wants_to_spawn: number;
  skilltree: string;
  last_used: number;
  last_update: Date;
}

export interface MyPetData {
  player: MyPetPlayer | null;
  pets: MyPetPet[];
  mostRecentPet: MyPetPet | null;
}