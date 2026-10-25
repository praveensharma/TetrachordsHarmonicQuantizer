{
  "patcher": {
    "fileversion": 1,
    "appversion": {
      "major": 9,
      "minor": 0,
      "revision": 0,
      "architecture": "x64",
      "modernui": 1
    },
    "classnamespace": "box",
    "rect": [
      100,
      100,
      720,
      169
    ],
    "devicewidth": 720,
    "openinpresentation": 1,
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
          "varname": "title",
          "numinlets": 1,
          "numoutlets": 0,
          "patching_rect": [
            15,
            8,
            285,
            25
          ],
          "fontname": "Arial",
          "fontsize": 18,
          "textcolor": [
            0.91,
            0.93,
            0.94,
            1
          ],
          "presentation": 1,
          "presentation_rect": [
            15,
            8,
            285,
            25
          ],
          "text": "Plinky Harmony Receiver",
          "fontface": 1
        }
      },
      {
        "box": {
          "id": "help",
          "maxclass": "comment",
          "varname": "help",
          "numinlets": 1,
          "numoutlets": 0,
          "patching_rect": [
            15,
            37,
            690,
            19
          ],
          "fontname": "Arial",
          "fontsize": 11,
          "textcolor": [
            0.91,
            0.93,
            0.94,
            1
          ],
          "presentation": 1,
          "presentation_rect": [
            15,
            37,
            690,
            19
          ],
          "text": "Chords NRPN \u00b7 dedicated Plinky input track \u00b7 Monitor In \u00b7 MIDI To: No Output"
        }
      },
      {
        "box": {
          "id": "root",
          "maxclass": "comment",
          "varname": "root",
          "numinlets": 1,
          "numoutlets": 0,
          "patching_rect": [
            15,
            59,
            690,
            19
          ],
          "fontname": "Arial",
          "fontsize": 11,
          "textcolor": [
            0.91,
            0.93,
            0.94,
            1
          ],
          "presentation": 1,
          "presentation_rect": [
            15,
            59,
            690,
            19
          ],
          "text": "Root: waiting"
        }
      },
      {
        "box": {
          "id": "chord",
          "maxclass": "comment",
          "varname": "chord",
          "numinlets": 1,
          "numoutlets": 0,
          "patching_rect": [
            15,
            79,
            690,
            19
          ],
          "fontname": "Arial",
          "fontsize": 11,
          "textcolor": [
            0.91,
            0.93,
            0.94,
            1
          ],
          "presentation": 1,
          "presentation_rect": [
            15,
            79,
            690,
            19
          ],
          "text": "Chord: waiting"
        }
      },
      {
        "box": {
          "id": "scale",
          "maxclass": "comment",
          "varname": "scale",
          "numinlets": 1,
          "numoutlets": 0,
          "patching_rect": [
            15,
            99,
            690,
            19
          ],
          "fontname": "Arial",
          "fontsize": 11,
          "textcolor": [
            0.91,
            0.93,
            0.94,
            1
          ],
          "presentation": 1,
          "presentation_rect": [
            15,
            99,
            690,
            19
          ],
          "text": "Scale: waiting"
        }
      },
      {
        "box": {
          "id": "live-status",
          "maxclass": "comment",
          "varname": "live-status",
          "numinlets": 1,
          "numoutlets": 0,
          "patching_rect": [
            15,
            119,
            690,
            19
          ],
          "fontname": "Arial",
          "fontsize": 10,
          "textcolor": [
            0.91,
            0.93,
            0.94,
            1
          ],
          "presentation": 1,
          "presentation_rect": [
            15,
            119,
            690,
            19
          ],
          "text": "Live Scale Sync: Off"
        }
      },
      {
        "box": {
          "id": "status",
          "maxclass": "comment",
          "varname": "status",
          "numinlets": 1,
          "numoutlets": 0,
          "patching_rect": [
            15,
            142,
            690,
            19
          ],
          "fontname": "Arial",
          "fontsize": 10,
          "textcolor": [
            0.91,
            0.93,
            0.94,
            1
          ],
          "presentation": 1,
          "presentation_rect": [
            15,
            142,
            690,
            19
          ],
          "text": "Waiting for MIDI"
        }
      },
      {
        "box": {
          "id": "publish",
          "maxclass": "umenu",
          "varname": "publish",
          "numinlets": 1,
          "numoutlets": 3,
          "patching_rect": [
            315,
            10,
            175,
            23
          ],
          "fontname": "Arial",
          "fontsize": 11,
          "textcolor": [
            0.91,
            0.93,
            0.94,
            1
          ],
          "presentation": 1,
          "presentation_rect": [
            315,
            10,
            175,
            23
          ],
          "parameter_enable": 1,
          "bgcolor": [
            0.22,
            0.25,
            0.28,
            1
          ],
          "saved_attribute_attributes": {
            "valueof": {
              "parameter_longname": "Publish Harmony",
              "parameter_shortname": "Publish Harmony",
              "parameter_type": 2,
              "parameter_mmin": 0,
              "parameter_mmax": 1,
              "parameter_initial_enable": 1,
              "parameter_initial": [
                0
              ],
              "parameter_enum": [
                "Monitor Only",
                "Publish Harmony"
              ]
            }
          },
          "items": [
            "Monitor Only",
            ",",
            "Publish Harmony"
          ],
          "outlettype": [
            "int",
            "",
            ""
          ]
        }
      },
      {
        "box": {
          "id": "live_scale_sync",
          "maxclass": "umenu",
          "varname": "live_scale_sync",
          "numinlets": 1,
          "numoutlets": 3,
          "patching_rect": [
            510,
            10,
            195,
            23
          ],
          "fontname": "Arial",
          "fontsize": 11,
          "textcolor": [
            0.91,
            0.93,
            0.94,
            1
          ],
          "presentation": 1,
          "presentation_rect": [
            510,
            10,
            195,
            23
          ],
          "parameter_enable": 1,
          "bgcolor": [
            0.22,
            0.25,
            0.28,
            1
          ],
          "saved_attribute_attributes": {
            "valueof": {
              "parameter_longname": "Live Scale Sync",
              "parameter_shortname": "Live Scale Sync",
              "parameter_type": 2,
              "parameter_mmin": 0,
              "parameter_mmax": 1,
              "parameter_initial_enable": 1,
              "parameter_initial": [
                0
              ],
              "parameter_enum": [
                "Live Scale: Off",
                "Live Scale: On"
              ]
            }
          },
          "items": [
            "Live Scale: Off",
            ",",
            "Live Scale: On"
          ],
          "outlettype": [
            "int",
            "",
            ""
          ]
        }
      },
      {
        "box": {
          "id": "midi",
          "maxclass": "newobj",
          "varname": "midi",
          "numinlets": 1,
          "numoutlets": 1,
          "patching_rect": [
            20,
            400,
            160,
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
          "text": "midiin"
        }
      },
      {
        "box": {
          "id": "engine",
          "maxclass": "newobj",
          "varname": "engine",
          "numinlets": 1,
          "numoutlets": 5,
          "patching_rect": [
            20,
            400,
            160,
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
          "text": "js plinky_harmony_receiver.js"
        }
      },
      {
        "box": {
          "id": "prepend",
          "maxclass": "newobj",
          "varname": "prepend",
          "numinlets": 1,
          "numoutlets": 1,
          "patching_rect": [
            20,
            400,
            160,
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
          "text": "prepend active"
        }
      },
      {
        "box": {
          "id": "live-send",
          "maxclass": "newobj",
          "varname": "live-send",
          "numinlets": 1,
          "numoutlets": 1,
          "patching_rect": [
            20,
            400,
            160,
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
          "text": "prepend livescalesync"
        }
      },
      {
        "box": {
          "id": "ready",
          "maxclass": "newobj",
          "varname": "ready",
          "numinlets": 1,
          "numoutlets": 3,
          "patching_rect": [
            20,
            400,
            160,
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
          "text": "live.thisdevice"
        }
      },
      {
        "box": {
          "id": "defer",
          "maxclass": "newobj",
          "varname": "defer",
          "numinlets": 1,
          "numoutlets": 1,
          "patching_rect": [
            20,
            400,
            160,
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
          "text": "deferlow"
        }
      },
      {
        "box": {
          "id": "init",
          "maxclass": "message",
          "varname": "init",
          "numinlets": 1,
          "numoutlets": 1,
          "patching_rect": [
            20,
            400,
            160,
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
          "text": "init"
        }
      }
    ],
    "lines": [
      {
        "patchline": {
          "source": [
            "midi",
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
            "publish",
            0
          ],
          "destination": [
            "prepend",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "prepend",
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
            "live_scale_sync",
            0
          ],
          "destination": [
            "live-send",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "live-send",
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
            "ready",
            0
          ],
          "destination": [
            "defer",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "defer",
            0
          ],
          "destination": [
            "init",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "init",
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
            "root",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "engine",
            2
          ],
          "destination": [
            "chord",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "engine",
            3
          ],
          "destination": [
            "scale",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "engine",
            4
          ],
          "destination": [
            "live-status",
            0
          ]
        }
      }
    ],
    "parameters": {
      "publish": [
        "Publish Harmony",
        "Publish Harmony",
        0
      ],
      "live_scale_sync": [
        "Live Scale Sync",
        "Live Scale Sync",
        0
      ]
    },
    "dependency_cache": [
      {
        "name": "plinky_harmony_receiver.js",
        "bootpath": ".",
        "type": "TEXT",
        "implicit": 1
      },
      {
        "name": "live_scale_bridge.js",
        "bootpath": ".",
        "type": "TEXT",
        "implicit": 1
      },
      {
        "name": "live_scale_matcher.js",
        "bootpath": ".",
        "type": "TEXT",
        "implicit": 1
      }
    ]
  }
}
