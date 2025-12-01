# GustPutt

A ridiculously over-engineered 2D physics golf game where the air itself is alive, moody, and occasionally tries to yeet your ball into the shadow realm.

**Live Demo:** https://mortalcoilfoundry.github.io/AG-IdleProject/  
*(Pro tip: Click and drag to putt. Let the wind whisper sweet nothings... or betrayals.)*

## Tech Flex (Yes, It's All Vanilla)

- Zero frameworks. Pure HTML5 Canvas + Web Audio API  
- 60 fps locked, < 2 MB total, runs on a potato (or your mom's flip phone)  
- Real-time pink-noise wind that literally breathes (35-second cycles, because why not make the world inhale?)  
- Triple low-pass filtered air, breathing + ultra-slow LFO modulation (the sound design that made me question reality)  
- AudioWorklet pink noise generator (falls back to ScriptProcessor like a coward when things get fancy)  
- Physics: continuous collision, sub-pixel accurate, no physics engine tax (just raw JS math.exe crashing parties)  
- Player trail with speed-scaled dark-core + double bloom glow (the juiciest trail in browser history — screenshots incoming)  
- Wind zones that swirl, push, and occasionally troll you into existential dread  
- Retro Game Boy palette (#0f380f / #306230 / #8bac0f / #9bbc0f) because taste > trends  

## Controls

- Click and drag to aim (slingshot style — power clamped, because restraint is key)  
- Release to putt (watch the wind decide your fate)  
- Cry when the ball ghosts the hole at Mach 5  
- Press 'D' for debug mode (walls glow, wind arrows point and laugh)  

## Dev Notes (For Nerds)

```js
audio.noiseGain.gain.value = 0.06;        // the exact number that made the dev cry (happy tears)
renderer.trailSize = speed * 0.85;        // math.exe has stopped working, but the glow lives on
breathingLfo.frequency.value = 0.028;     // the world inhales... and exhales your dreams
```

Wind strength 0 = zen garden therapy session  
Wind strength > 0 = good luck, champion — the breeze has beef  

## Credits

- Code, audio, pixels, existential dread: [You / Mortal Coil Foundry](https://github.com/mortalcoilfoundry)  
- Pink noise algorithm stolen from the ghosts of 1970s synthesizers (sorry, Robert Moog)  
- Trail glow technique reverse-engineered from 90s demoscene legends while eating cereal at 3 a.m. (and questioning life choices)  

## License

MIT. Steal the trail code. Steal the breathing wind. Just don't steal the soul. (It's already sold to the breeze. We split the royalties 50/50.)

Now go play it: https://mortalcoilfoundry.github.io/AG-IdleProject/

The wind is waiting.  
Don't keep it hanging.  
Or do. It'll gust you anyway.

— GustPutt, December 2025
