#!/usr/bin/env python3
"""Build the canonical 108-entry mantra table.

Run: python3 scripts/build_mantra_table.py > data/om_cipher/mantra_table.json

Entries are short, original, archetypal mantra strings (single sentence,
internal phrasing — no copyrighted text). The table is a complete mala
cycle of 108. The engine selects an entry by
  index = (life_path + expression + lunar_phase) mod 108
"""
import json
import sys

# Twelve verbs × nine objects × one of three closing phrasings, but
# selected by hand to stay short and varied. We curate 108 distinct lines.

ENTRIES = [
    # Life path 1 family (initiation, beginnings)
    "I begin where the path has not yet been walked.",
    "I open the door no one else can see.",
    "The first step is mine to take, and I take it.",
    "I stand at the edge that becomes the road.",
    "From silence I shape the first sound.",
    "What begins in me becomes a way for others.",
    "I trust the spark before it becomes flame.",
    "I lead by going first, not by going alone.",
    "I claim the beginning that asks for me.",

    # Life path 2 family (partnership, balance)
    "I meet the other and the field becomes whole.",
    "Between us the third thing is born.",
    "I hold what asks to be held, and let go what asks to be free.",
    "I listen until the answer arrives.",
    "Two threads, one weave; I follow the pattern.",
    "I balance by feeling the weight on both sides.",
    "Where I meet you, the world remembers itself.",
    "I move at the speed of trust.",
    "My strength is the steadiness between.",

    # Life path 3 family (creativity, expression)
    "I let the song that is already in me become sound.",
    "I make in order to know.",
    "I speak the bright thing as soon as it arrives.",
    "Joy is a discipline I keep.",
    "I do not save the colour for later.",
    "My voice belongs to the field, not only to me.",
    "I shape delight from what is at hand.",
    "I let the play be the work.",
    "What wants to be made through me, I make.",

    # Life path 4 family (structure, foundation)
    "I build the unseen into form.",
    "I lay the stone exactly where it belongs.",
    "Slowly is also a way of arriving.",
    "I am the floor others stand on.",
    "What endures is what I tend.",
    "I make the table that holds the meal.",
    "I work because the work itself is enough.",
    "I keep the promise the structure makes.",
    "I trust the patience of right placement.",

    # Life path 5 family (change, freedom)
    "I move so the field can move with me.",
    "I am at home in the changing wind.",
    "I let the new map redraw the old one.",
    "I follow the question, not the comfort.",
    "Freedom is also a kind of discipline.",
    "I do not stay where I have already arrived.",
    "I trade certainty for direction.",
    "What I cannot hold, I let teach me.",
    "I keep the door open behind me.",

    # Life path 6 family (service, harmony, nurture)
    "I tend what is mine to tend.",
    "I make the place where others can rest.",
    "I carry the small, near things.",
    "I love what is in front of me first.",
    "My care is a form of seeing.",
    "I keep the hearth lit for the longer story.",
    "I serve the whole by serving the next thing.",
    "I let beauty be a daily practice.",
    "Where I am, the field is gentler.",

    # Life path 7 family (introspection, study)
    "I go inward until the answer surfaces.",
    "I do not chase what is meant to find me.",
    "Silence is also a kind of study.",
    "I trust the slow yield of attention.",
    "I read the world as text, and myself as commentary.",
    "I let the question stay open as long as it needs.",
    "I look behind the form for the form behind the form.",
    "I keep the lamp lit in the inner room.",
    "What I learn becomes the way I see.",

    # Life path 8 family (power, mastery)
    "I take responsibility for what I have built.",
    "Power moves through me as steadiness.",
    "I match the size of my reach to the size of my care.",
    "I am willing to be seen at scale.",
    "I keep my word the size of my work.",
    "I treat material things as sacred matter.",
    "I lead the current without owning the river.",
    "Mastery is daily, not final.",
    "I let the work meet the world.",

    # Life path 9 family (completion, compassion)
    "I release what is finished so the new can arrive.",
    "I bless what is leaving.",
    "I let endings be doorways.",
    "I carry forward only what is mine to carry.",
    "Compassion is the last form of strength.",
    "I forgive at the speed of clarity.",
    "I let the river take what it came for.",
    "I close gently so others can close too.",
    "I tend the long arc.",

    # Life path 11 family (intuition, vision)
    "I trust the signal before it has a name.",
    "I am the lens, not the light.",
    "I let the vision arrive on its own time.",
    "I do not own the message I carry.",
    "I hold the high frequency in ordinary days.",
    "What I see is meant to be shared.",
    "I attune until the field clarifies.",
    "I let the dream stay translucent.",
    "I am tuned, and I tune what I touch.",

    # Life path 22 family (master builder, vision into form)
    "I build the invisible into form, and the form into light.",
    "I bring the long vision down to the next stone.",
    "I work at the scale the vision asks for.",
    "I make the impossible thing one decision at a time.",
    "I trust the scaffolding even when the roof is far away.",
    "I let the small task hold the large pattern.",
    "I am answerable to what I have been given to make.",
    "I keep the architecture honest.",
    "What I build outlives the building of it.",

    # Life path 33 family (master teacher, devotion, healing)
    "I teach by what I am willing to embody.",
    "I let love do the work love is for.",
    "I bring the medicine and trust the receiver.",
    "I hold the space; the healing is its own.",
    "I devote my attention to what mends.",
    "I am steady so others can be moved.",
    "I let my life be the lesson I cannot say.",
    "I keep the heart open at the cost of comfort.",
    "I love the world by tending the one in front of me.",
]

assert len(ENTRIES) == 108, len(ENTRIES)

# Affinity tags — match the family blocks above. Lunar affinity is a
# light hint, not gating logic; selection is purely modular.
LP_FAMILY_ORDER = [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22, 33]
KEYNOTES = {
    1:  "Initiation",
    2:  "Balance",
    3:  "Expression",
    4:  "Foundation",
    5:  "Change",
    6:  "Care",
    7:  "Inwardness",
    8:  "Mastery",
    9:  "Release",
    11: "Vision",
    22: "Builder",
    33: "Devotion",
}


def main():
    out = {
        "source": "Internal — Om Cipher v1",
        "note": (
            "108 short, original archetypal mantras. No copyrighted text. "
            "Selected by the engine via index = (life_path + expression + "
            "lunar_phase) mod 108. The Om Cipher mantra is the deterministic "
            "mirror — evolving personal mantra lives in Living Profile."
        ),
        "size": 108,
        "entries": [],
    }
    for i, mantra in enumerate(ENTRIES):
        family_index = i // 9
        family_lp = LP_FAMILY_ORDER[family_index]
        out["entries"].append({
            "index": i,
            "mantra": mantra,
            "keynote": KEYNOTES[family_lp],
            "life_path_affinity": [family_lp],
        })
    json.dump(out, sys.stdout, indent=2, ensure_ascii=False)
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()
