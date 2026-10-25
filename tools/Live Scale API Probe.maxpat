{
  "patcher": {
    "fileversion": 1,
    "appversion": { "major": 9, "minor": 1, "revision": 5, "architecture": "x64", "modernui": 1 },
    "classnamespace": "box",
    "rect": [100.0, 100.0, 780.0, 260.0],
    "boxes": [
      { "box": { "id": "title", "maxclass": "comment", "text": "Tetrachords Live Scale API Probe", "fontsize": 18.0, "fontface": 1, "patching_rect": [20.0, 15.0, 360.0, 25.0] } },
      { "box": { "id": "help", "maxclass": "comment", "text": "Select a MIDI or audio clip in Live, then click Probe. Current values are written back unchanged.", "patching_rect": [20.0, 48.0, 720.0, 20.0] } },
      { "box": { "id": "probe-button", "maxclass": "textbutton", "text": "Probe Song + Selected Clip", "texton": "Probe Song + Selected Clip", "mode": 0, "patching_rect": [20.0, 82.0, 190.0, 28.0] } },
      { "box": { "id": "probe-message", "maxclass": "message", "text": "probe", "patching_rect": [225.0, 85.0, 45.0, 22.0] } },
      { "box": { "id": "clear-button", "maxclass": "message", "text": "clearobservers", "patching_rect": [285.0, 85.0, 100.0, 22.0] } },
      { "box": { "id": "probe-js", "maxclass": "newobj", "text": "js live_scale_api_probe.js", "numinlets": 1, "numoutlets": 1, "patching_rect": [20.0, 130.0, 190.0, 22.0] } },
      { "box": { "id": "result", "maxclass": "message", "text": "Probe output appears here and in the Max Console", "patching_rect": [20.0, 175.0, 730.0, 45.0], "linecount": 2 } }
    ],
    "lines": [
      { "patchline": { "source": ["probe-button", 0], "destination": ["probe-message", 0] } },
      { "patchline": { "source": ["probe-message", 0], "destination": ["probe-js", 0] } },
      { "patchline": { "source": ["clear-button", 0], "destination": ["probe-js", 0] } },
      { "patchline": { "source": ["probe-js", 0], "destination": ["result", 1] } }
    ]
  }
}

