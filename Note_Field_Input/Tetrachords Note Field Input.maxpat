{
  "patcher": {
    "fileversion": 1,
    "appversion": {
      "major": 9,
      "minor": 0,
      "revision": 0,
      "architecture": "arm64"
    },
    "rect": [
      0,
      0,
      760,
      620
    ],
    "openinpresentation": 1,
    "devicewidth": 520,
    "bgcolor": [
      0.12,
      0.14,
      0.16,
      1
    ],
    "boxes": [
      {
        "box": {
          "id": "title",
          "maxclass": "comment",
          "numinlets": 1,
          "numoutlets": 0,
          "patching_rect": [
            15,
            9,
            460,
            25
          ],
          "text": "Tetrachords Note Field Input",
          "presentation": 1,
          "presentation_rect": [
            15,
            9,
            460,
            25
          ],
          "fontname": "Arial",
          "fontsize": 17,
          "textcolor": [
            0.91,
            0.93,
            0.94,
            1
          ],
          "bgcolor": [
            0,
            0,
            0,
            0
          ],
          "fontface": 1
        }
      },
      {
        "box": {
          "id": "help",
          "maxclass": "comment",
          "numinlets": 1,
          "numoutlets": 0,
          "patching_rect": [
            15,
            43,
            490,
            22
          ],
          "text": "Track input: Tetrachords → Ch. 3 · Monitor In · MIDI To: No Output",
          "presentation": 1,
          "presentation_rect": [
            15,
            43,
            490,
            22
          ],
          "fontname": "Arial",
          "fontsize": 11,
          "textcolor": [
            0.91,
            0.93,
            0.94,
            1
          ],
          "bgcolor": [
            0,
            0,
            0,
            0
          ]
        }
      },
      {
        "box": {
          "id": "status",
          "maxclass": "comment",
          "numinlets": 1,
          "numoutlets": 0,
          "patching_rect": [
            15,
            77,
            490,
            30
          ],
          "text": "Waiting for notes",
          "presentation": 1,
          "presentation_rect": [
            15,
            77,
            490,
            30
          ],
          "fontname": "Arial",
          "fontsize": 11,
          "textcolor": [
            0.91,
            0.93,
            0.94,
            1
          ],
          "bgcolor": [
            0,
            0,
            0,
            0
          ]
        }
      },
      {
        "box": {
          "id": "notes",
          "maxclass": "comment",
          "numinlets": 1,
          "numoutlets": 0,
          "patching_rect": [
            15,
            110,
            490,
            27
          ],
          "text": "No field captured yet",
          "presentation": 1,
          "presentation_rect": [
            15,
            110,
            490,
            27
          ],
          "fontname": "Arial",
          "fontsize": 11,
          "textcolor": [
            0.44,
            0.85,
            0.73,
            1
          ],
          "bgcolor": [
            0,
            0,
            0,
            0
          ]
        }
      },
      {
        "box": {
          "id": "footer",
          "maxclass": "comment",
          "numinlets": 1,
          "numoutlets": 0,
          "patching_rect": [
            15,
            144,
            490,
            20
          ],
          "text": "Receiver Field input: Separate track · Note Offs do not clear the field",
          "presentation": 1,
          "presentation_rect": [
            15,
            144,
            490,
            20
          ],
          "fontname": "Arial",
          "fontsize": 10,
          "textcolor": [
            0.91,
            0.93,
            0.94,
            1
          ],
          "bgcolor": [
            0,
            0,
            0,
            0
          ]
        }
      },
      {
        "box": {
          "id": "in",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 1,
          "patching_rect": [
            10,
            345,
            240,
            22
          ],
          "text": "midiin"
        }
      },
      {
        "box": {
          "id": "engine",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 2,
          "patching_rect": [
            10,
            370,
            240,
            22
          ],
          "text": "js note_field_input.js"
        }
      },
      {
        "box": {
          "id": "load",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 3,
          "patching_rect": [
            10,
            395,
            240,
            22
          ],
          "text": "live.thisdevice"
        }
      },
      {
        "box": {
          "id": "active",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 1,
          "patching_rect": [
            10,
            420,
            240,
            22
          ],
          "text": "prepend active"
        }
      }
    ],
    "lines": [
      {
        "patchline": {
          "source": [
            "in",
            0
          ],
          "destination": [
            "engine",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "engine",
            0
          ],
          "destination": [
            "status",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "engine",
            1
          ],
          "destination": [
            "notes",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "load",
            1
          ],
          "destination": [
            "active",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "active",
            0
          ],
          "destination": [
            "engine",
            0
          ]
        }
      }
    ],
    "dependency_cache": [
      {
        "name": "note_field_input.js",
        "bootpath": ".",
        "type": "TEXT",
        "implicit": 1
      }
    ]
  }
}
