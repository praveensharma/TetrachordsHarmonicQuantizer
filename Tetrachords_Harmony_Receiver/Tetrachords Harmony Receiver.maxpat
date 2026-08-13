{
  "patcher": {
    "fileversion": 1,
    "appversion": {
      "major": 8,
      "minor": 6,
      "revision": 5,
      "architecture": "x64",
      "modernui": 1
    },
    "classnamespace": "box",
    "rect": [
      100.0,
      100.0,
      720.0,
      310.0
    ],
    "bglocked": 0,
    "openinpresentation": 1,
    "default_fontsize": 12.0,
    "default_fontface": 0,
    "default_fontname": "Arial",
    "gridonopen": 1,
    "gridsize": [
      15.0,
      15.0
    ],
    "toolbarvisible": 1,
    "boxanimatetime": 200,
    "imprint": 0,
    "enablehscroll": 1,
    "enablevscroll": 1,
    "devicewidth": 690.0,
    "description": "Receives Tetrachords SysEx and captures the exact active MIDI chord.",
    "digest": "Tetrachords scale and active-chord receiver for the companion OXI quantizer.",
    "tags": "MIDI Tetrachords harmony quantizer",
    "boxes": [
      {
        "box": {
          "id": "obj-title",
          "maxclass": "comment",
          "text": "Tetrachords Harmony Receiver",
          "fontsize": 16.0,
          "fontface": 1,
          "patching_rect": [
            20.0,
            15.0,
            310.0,
            24.0
          ],
          "presentation": 1,
          "presentation_rect": [
            15.0,
            10.0,
            310.0,
            24.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-subtitle",
          "maxclass": "comment",
          "text": "Tetrachords USB track • captures SysEx plus active chord notes • MIDI To: No Output",
          "patching_rect": [
            20.0,
            42.0,
            490.0,
            20.0
          ],
          "presentation": 1,
          "presentation_rect": [
            15.0,
            36.0,
            510.0,
            20.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-midiin",
          "maxclass": "newobj",
          "text": "midiin",
          "patching_rect": [
            20.0,
            90.0,
            48.0,
            22.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-js",
          "maxclass": "newobj",
          "text": "js tetrachords_harmony_receiver.js",
          "numinlets": 1,
          "numoutlets": 2,
          "outlettype": [
            "",
            ""
          ],
          "patching_rect": [
            105.0,
            90.0,
            235.0,
            22.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-status-label",
          "maxclass": "comment",
          "text": "Status",
          "patching_rect": [
            20.0,
            145.0,
            50.0,
            20.0
          ],
          "presentation": 1,
          "presentation_rect": [
            15.0,
            66.0,
            50.0,
            20.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-status",
          "maxclass": "message",
          "text": "Waiting for Live initialization",
          "patching_rect": [
            105.0,
            143.0,
            510.0,
            22.0
          ],
          "presentation": 1,
          "presentation_rect": [
            65.0,
            64.0,
            600.0,
            22.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-harmony-label",
          "maxclass": "comment",
          "text": "Raw harmony bus message",
          "patching_rect": [
            20.0,
            180.0,
            150.0,
            20.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-harmony",
          "maxclass": "message",
          "text": "harmony",
          "patching_rect": [
            180.0,
            178.0,
            435.0,
            22.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-deferlow",
          "maxclass": "newobj",
          "text": "deferlow",
          "patching_rect": [
            130.0,
            230.0,
            60.0,
            22.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-init",
          "maxclass": "message",
          "text": "init",
          "patching_rect": [
            205.0,
            230.0,
            40.0,
            22.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-rebroadcast",
          "maxclass": "message",
          "text": "rebroadcast",
          "patching_rect": [
            260.0,
            230.0,
            85.0,
            22.0
          ],
          "presentation": 0,
          "presentation_rect": [
            15.0,
            100.0,
            85.0,
            22.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-live-on",
          "maxclass": "message",
          "text": "updatelive 1",
          "patching_rect": [
            360.0,
            230.0,
            90.0,
            22.0
          ],
          "presentation": 0,
          "presentation_rect": [
            115.0,
            100.0,
            90.0,
            22.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-live-off",
          "maxclass": "message",
          "text": "updatelive 0",
          "patching_rect": [
            465.0,
            230.0,
            90.0,
            22.0
          ],
          "presentation": 0,
          "presentation_rect": [
            220.0,
            100.0,
            90.0,
            22.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-chord-channel-label",
          "maxclass": "comment",
          "text": "Chord Ch",
          "patching_rect": [
            20.0,
            270.0,
            60.0,
            20.0
          ],
          "presentation": 1,
          "presentation_rect": [
            15.0,
            102.0,
            60.0,
            20.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-chord-channel-menu",
          "maxclass": "umenu",
          "items": [
            "all",
            ",",
            "1",
            ",",
            "2",
            ",",
            "3",
            ",",
            "4",
            ",",
            "5",
            ",",
            "6",
            ",",
            "7",
            ",",
            "8",
            ",",
            "9",
            ",",
            "10",
            ",",
            "11",
            ",",
            "12",
            ",",
            "13",
            ",",
            "14",
            ",",
            "15",
            ",",
            "16"
          ],
          "numinlets": 1,
          "numoutlets": 3,
          "outlettype": [
            "int",
            "",
            ""
          ],
          "patching_rect": [
            95.0,
            270.0,
            80.0,
            22.0
          ],
          "presentation": 1,
          "presentation_rect": [
            75.0,
            100.0,
            80.0,
            22.0
          ],
          "parameter_enable": 1,
          "varname": "chord_channel",
          "saved_attribute_attributes": {
            "valueof": {
              "parameter_longname": "Chord Channel",
              "parameter_shortname": "Chord Ch",
              "parameter_type": 2,
              "parameter_mmax": 16,
              "parameter_enum": [
                "all",
                "1",
                "2",
                "3",
                "4",
                "5",
                "6",
                "7",
                "8",
                "9",
                "10",
                "11",
                "12",
                "13",
                "14",
                "15",
                "16"
              ],
              "parameter_initial_enable": 1,
              "parameter_initial": [
                0
              ]
            }
          }
        }
      },
      {
        "box": {
          "id": "obj-chord-channel-help",
          "maxclass": "comment",
          "text": "SysEx keeps the last chord active after Note Off; Gate follows the chord-note length.",
          "patching_rect": [
            190.0,
            270.0,
            560.0,
            20.0
          ],
          "presentation": 1,
          "presentation_rect": [
            15.0,
            132.0,
            570.0,
            20.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-chord-hold-label",
          "maxclass": "comment",
          "text": "Chord Hold",
          "patching_rect": [
            435.0,
            270.0,
            75.0,
            20.0
          ],
          "presentation": 1,
          "presentation_rect": [
            175.0,
            102.0,
            75.0,
            20.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-chord-hold-menu",
          "maxclass": "umenu",
          "items": [
            "sysex",
            ",",
            "gate"
          ],
          "numinlets": 1,
          "numoutlets": 3,
          "outlettype": [
            "int",
            "",
            ""
          ],
          "patching_rect": [
            520.0,
            270.0,
            80.0,
            22.0
          ],
          "presentation": 1,
          "presentation_rect": [
            250.0,
            100.0,
            80.0,
            22.0
          ],
          "parameter_enable": 1,
          "varname": "chord_hold",
          "saved_attribute_attributes": {
            "valueof": {
              "parameter_longname": "Chord Hold",
              "parameter_shortname": "Chord Hold",
              "parameter_type": 2,
              "parameter_mmax": 1,
              "parameter_enum": [
                "sysex",
                "gate"
              ],
              "parameter_initial_enable": 1,
              "parameter_initial": [
                0
              ]
            }
          }
        }
      },
      {
        "box": {
          "id": "obj-chord-hold-prepend",
          "maxclass": "newobj",
          "text": "prepend chordhold",
          "numinlets": 1,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            435.0,
            305.0,
            125.0,
            22.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-chord-channel-prepend",
          "maxclass": "newobj",
          "text": "prepend chordchannel",
          "numinlets": 1,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            190.0,
            270.0,
            135.0,
            22.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-thisdevice",
          "maxclass": "newobj",
          "text": "live.thisdevice",
          "patching_rect": [
            20.0,
            230.0,
            95.0,
            22.0
          ]
        }
      }
    ],
    "lines": [
      {
        "patchline": {
          "source": [
            "obj-midiin",
            0
          ],
          "destination": [
            "obj-js",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-js",
            0
          ],
          "destination": [
            "obj-status",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-js",
            1
          ],
          "destination": [
            "obj-harmony",
            1
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-thisdevice",
            0
          ],
          "destination": [
            "obj-deferlow",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-deferlow",
            0
          ],
          "destination": [
            "obj-init",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-init",
            0
          ],
          "destination": [
            "obj-js",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-rebroadcast",
            0
          ],
          "destination": [
            "obj-js",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-live-on",
            0
          ],
          "destination": [
            "obj-js",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-live-off",
            0
          ],
          "destination": [
            "obj-js",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-chord-channel-menu",
            1
          ],
          "destination": [
            "obj-chord-channel-prepend",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-chord-channel-prepend",
            0
          ],
          "destination": [
            "obj-js",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-chord-hold-menu",
            1
          ],
          "destination": [
            "obj-chord-hold-prepend",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-chord-hold-prepend",
            0
          ],
          "destination": [
            "obj-js",
            0
          ]
        }
      }
    ],
    "dependency_cache": [
      {
        "name": "tetrachords_harmony_receiver.js",
        "type": "TEXT",
        "implicit": 1
      }
    ],
    "autosave": 0
  }
}
