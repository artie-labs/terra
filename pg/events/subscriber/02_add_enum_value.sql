-- apply: before-publisher
-- The subscriber enum must know the label before a row using it arrives.
ALTER TYPE animal_species ADD VALUE IF NOT EXISTS 'pangolin';
