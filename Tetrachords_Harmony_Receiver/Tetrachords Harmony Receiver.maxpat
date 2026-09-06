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
      410.0
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
    "devicewidth": 790,
    "description": "Receives Tetrachords SysEx, active chord notes and an optional authoritative MIDI note field.",
    "digest": "Tetrachords harmonic-state receiver for the companion Harmonic Quantizer.",
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
            15,
            7,
            310,
            24
          ],
          "fontname": "Arial",
          "textcolor": [
            0.91,
            0.93,
            0.94,
            1.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-subtitle",
          "maxclass": "comment",
          "text": "HARMONIC INPUT  /  SysEx and MIDI note comparison",
          "patching_rect": [
            20.0,
            42.0,
            490.0,
            20.0
          ],
          "presentation": 0,
          "presentation_rect": [
            335,
            10,
            440,
            18
          ],
          "fontsize": 10.0,
          "fontname": "Arial",
          "textcolor": [
            0.66,
            0.72,
            0.76,
            1.0
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
          "numoutlets": 5,
          "outlettype": [
            "",
            "",
            "",
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
          "presentation": 0,
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
          "maxclass": "comment",
          "text": "Waiting for Live initialization",
          "patching_rect": [
            105.0,
            143.0,
            510.0,
            22.0
          ],
          "presentation": 1,
          "presentation_rect": [
            15,
            140,
            760,
            23
          ],
          "fontsize": 11.0,
          "fontname": "Arial",
          "textcolor": [
            0.91,
            0.93,
            0.94,
            1.0
          ],
          "bgcolor": [
            0.0,
            0.0,
            0.0,
            0.0
          ],
          "ignoreclick": 1,
          "numinlets": 1,
          "numoutlets": 0,
          "varname": "obj-status",
          "hidden": 0
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
            15,
            103,
            80,
            18
          ],
          "fontsize": 11.0,
          "fontname": "Arial",
          "textcolor": [
            0.66,
            0.72,
            0.76,
            1.0
          ],
          "varname": "obj-chord-channel-label",
          "hidden": 0
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
            100,
            100,
            70,
            23
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
          },
          "fontsize": 11.0,
          "fontname": "Arial",
          "textcolor": [
            0.91,
            0.93,
            0.94,
            1.0
          ],
          "bgcolor": [
            0.22,
            0.25,
            0.28,
            1.0
          ],
          "hidden": 0
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
          "presentation": 0,
          "presentation_rect": [
            15.0,
            242.0,
            650.0,
            20.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-chord-hold-label",
          "maxclass": "comment",
          "text": "Hold",
          "patching_rect": [
            435.0,
            270.0,
            75.0,
            20.0
          ],
          "presentation": 1,
          "presentation_rect": [
            185,
            103,
            65,
            18
          ],
          "fontsize": 11.0,
          "fontname": "Arial",
          "textcolor": [
            0.66,
            0.72,
            0.76,
            1.0
          ],
          "varname": "obj-chord-hold-label",
          "hidden": 0
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
            250,
            100,
            65,
            23
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
          },
          "fontsize": 11.0,
          "fontname": "Arial",
          "textcolor": [
            0.91,
            0.93,
            0.94,
            1.0
          ],
          "bgcolor": [
            0.22,
            0.25,
            0.28,
            1.0
          ],
          "hint": "SysEx latches each chord update; Gate follows Note On/Off lengths.",
          "hidden": 0
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
          "id": "obj-valid-source-label",
          "maxclass": "comment",
          "text": "Valid Notes",
          "patching_rect": [
            20.0,
            340.0,
            75.0,
            20.0
          ],
          "presentation": 1,
          "presentation_rect": [
            15,
            43,
            80,
            18
          ],
          "fontsize": 11.0,
          "fontname": "Arial",
          "textcolor": [
            0.66,
            0.72,
            0.76,
            1.0
          ],
          "varname": "obj-valid-source-label",
          "hidden": 0
        }
      },
      {
        "box": {
          "id": "obj-valid-source-menu",
          "maxclass": "umenu",
          "items": [
            "SysEx Intervals",
            ",",
            "MIDI Note Field"
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
            340.0,
            125.0,
            22.0
          ],
          "presentation": 1,
          "presentation_rect": [
            100,
            40,
            210,
            23
          ],
          "parameter_enable": 1,
          "varname": "valid_note_source",
          "saved_attribute_attributes": {
            "valueof": {
              "parameter_longname": "Valid Note Source",
              "parameter_shortname": "Valid Source",
              "parameter_type": 2,
              "parameter_mmax": 1,
              "parameter_enum": [
                "SysEx Intervals",
                "MIDI Note Field"
              ],
              "parameter_initial_enable": 1,
              "parameter_initial": [
                0
              ]
            }
          },
          "fontsize": 11.0,
          "fontname": "Arial",
          "textcolor": [
            0.91,
            0.93,
            0.94,
            1.0
          ],
          "bgcolor": [
            0.22,
            0.25,
            0.28,
            1.0
          ],
          "hint": "Select the active valid-note collection. Both sources remain visible for comparison.",
          "hidden": 0
        }
      },
      {
        "box": {
          "id": "obj-valid-source-prepend",
          "maxclass": "newobj",
          "text": "prepend validsource",
          "numinlets": 1,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            235.0,
            340.0,
            130.0,
            22.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-valid-channel-label",
          "maxclass": "comment",
          "text": "MIDI field ch",
          "patching_rect": [
            385.0,
            340.0,
            65.0,
            20.0
          ],
          "presentation": 1,
          "presentation_rect": [
            15,
            73,
            80,
            18
          ],
          "fontsize": 11.0,
          "fontname": "Arial",
          "textcolor": [
            0.66,
            0.72,
            0.76,
            1.0
          ],
          "varname": "obj-valid-channel-label",
          "hidden": 0
        }
      },
      {
        "box": {
          "id": "obj-valid-channel-menu",
          "maxclass": "umenu",
          "items": [
            "off",
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
            450.0,
            340.0,
            70.0,
            22.0
          ],
          "presentation": 1,
          "presentation_rect": [
            100,
            70,
            80,
            23
          ],
          "parameter_enable": 1,
          "varname": "valid_note_channel",
          "saved_attribute_attributes": {
            "valueof": {
              "parameter_longname": "MIDI Note Field Channel",
              "parameter_shortname": "Field Ch",
              "parameter_type": 2,
              "parameter_mmax": 16,
              "parameter_enum": [
                "off",
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
          },
          "fontsize": 11.0,
          "fontname": "Arial",
          "textcolor": [
            0.91,
            0.93,
            0.94,
            1.0
          ],
          "bgcolor": [
            0.22,
            0.25,
            0.28,
            1.0
          ],
          "hint": "Dedicated MIDI note-field input channel. Off retains the last complete field.",
          "hidden": 0
        }
      },
      {
        "box": {
          "id": "obj-valid-channel-prepend",
          "maxclass": "newobj",
          "text": "prepend validnotechannel",
          "numinlets": 1,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            535.0,
            340.0,
            160.0,
            22.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-derived-monitor",
          "maxclass": "comment",
          "text": "SysEx Intervals: waiting",
          "patching_rect": [
            20.0,
            375.0,
            650.0,
            22.0
          ],
          "presentation": 1,
          "presentation_rect": [
            335,
            40,
            440,
            23
          ],
          "fontsize": 11.0,
          "fontname": "Arial",
          "textcolor": [
            0.91,
            0.93,
            0.94,
            1.0
          ],
          "bgcolor": [
            0.0,
            0.0,
            0.0,
            0.0
          ],
          "ignoreclick": 1,
          "numinlets": 1,
          "numoutlets": 0,
          "varname": "obj-derived-monitor",
          "hidden": 0
        }
      },
      {
        "box": {
          "id": "obj-midi-valid-monitor",
          "maxclass": "comment",
          "text": "MIDI Note Field: Off",
          "patching_rect": [
            20.0,
            402.0,
            650.0,
            22.0
          ],
          "presentation": 1,
          "presentation_rect": [
            335,
            69,
            440,
            23
          ],
          "fontsize": 11.0,
          "fontname": "Arial",
          "textcolor": [
            0.91,
            0.93,
            0.94,
            1.0
          ],
          "bgcolor": [
            0.0,
            0.0,
            0.0,
            0.0
          ],
          "ignoreclick": 1,
          "numinlets": 1,
          "numoutlets": 0,
          "varname": "obj-midi-valid-monitor",
          "hidden": 0
        }
      },
      {
        "box": {
          "id": "obj-active-valid-monitor",
          "maxclass": "comment",
          "text": "Active: SysEx Intervals • no complete set",
          "patching_rect": [
            20.0,
            429.0,
            650.0,
            22.0
          ],
          "presentation": 1,
          "presentation_rect": [
            335,
            98,
            440,
            34
          ],
          "fontsize": 11.0,
          "fontname": "Arial",
          "textcolor": [
            0.44,
            0.85,
            0.73,
            1.0
          ],
          "bgcolor": [
            0.0,
            0.0,
            0.0,
            0.0
          ],
          "ignoreclick": 1,
          "linecount": 2,
          "numinlets": 1,
          "numoutlets": 0,
          "varname": "obj-active-valid-monitor",
          "hidden": 0
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
      },
      {
        "box": {
          "id": "monitor-play-tab",
          "maxclass": "textbutton",
          "numinlets": 1,
          "numoutlets": 3,
          "patching_rect": [
            610,
            7,
            80,
            23
          ],
          "varname": "monitor-play-tab",
          "presentation": 1,
          "presentation_rect": [
            610,
            7,
            80,
            23
          ],
          "text": "Play",
          "texton": "Play",
          "mode": 0,
          "outlettype": [
            "",
            "int",
            ""
          ],
          "rounded": 7,
          "bgcolor": [
            0.04,
            0.48,
            1,
            1
          ],
          "textcolor": [
            0.91,
            0.93,
            0.94,
            1
          ],
          "fontsize": 11
        }
      },
      {
        "box": {
          "id": "monitor-play-bang",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 1,
          "patching_rect": [
            10,
            1800,
            180,
            22
          ],
          "varname": "monitor-play-bang",
          "text": "t b"
        }
      },
      {
        "box": {
          "id": "monitor-play-message",
          "maxclass": "message",
          "numinlets": 1,
          "numoutlets": 1,
          "patching_rect": [
            10,
            1800,
            180,
            22
          ],
          "varname": "monitor-play-message",
          "text": "page 0"
        }
      },
      {
        "box": {
          "id": "monitor-monitor-tab",
          "maxclass": "textbutton",
          "numinlets": 1,
          "numoutlets": 3,
          "patching_rect": [
            695,
            7,
            80,
            23
          ],
          "varname": "monitor-monitor-tab",
          "presentation": 1,
          "presentation_rect": [
            695,
            7,
            80,
            23
          ],
          "text": "Monitor",
          "texton": "Monitor",
          "mode": 0,
          "outlettype": [
            "",
            "int",
            ""
          ],
          "rounded": 7,
          "bgcolor": [
            0.22,
            0.25,
            0.28,
            1
          ],
          "textcolor": [
            0.91,
            0.93,
            0.94,
            1
          ],
          "fontsize": 11
        }
      },
      {
        "box": {
          "id": "monitor-monitor-bang",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 1,
          "patching_rect": [
            10,
            1800,
            180,
            22
          ],
          "varname": "monitor-monitor-bang",
          "text": "t b"
        }
      },
      {
        "box": {
          "id": "monitor-monitor-message",
          "maxclass": "message",
          "numinlets": 1,
          "numoutlets": 1,
          "patching_rect": [
            10,
            1800,
            180,
            22
          ],
          "varname": "monitor-monitor-message",
          "text": "page 1"
        }
      },
      {
        "box": {
          "id": "monitor-detail",
          "maxclass": "jsui",
          "numinlets": 1,
          "numoutlets": 0,
          "patching_rect": [
            15,
            40,
            760,
            98
          ],
          "varname": "monitor-detail",
          "presentation": 1,
          "presentation_rect": [
            15,
            40,
            760,
            98
          ],
          "jsarguments": [
            "receiver",
            "{\"play\": [\"obj-status\", \"obj-chord-channel-label\", \"chord_channel\", \"obj-chord-hold-label\", \"chord_hold\", \"obj-valid-source-label\", \"valid_note_source\", \"obj-valid-channel-label\", \"valid_note_channel\", \"obj-derived-monitor\", \"obj-midi-valid-monitor\", \"obj-active-valid-monitor\"], \"monitor\": [\"monitor-detail\"]}"
          ],
          "hidden": 1,
          "filename": "harmonic_monitor.js",
          "parameter_enable": 0,
          "border": 0,
          "bgcolor": [
            0,
            0,
            0,
            0
          ],
          "ignoreclick": 1
        }
      }
    ],
    "lines": [
      {
        "patchline": {
          "source": [
            "obj-valid-source-menu",
            1
          ],
          "destination": [
            "obj-valid-source-prepend",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-valid-source-prepend",
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
            "obj-valid-channel-menu",
            1
          ],
          "destination": [
            "obj-valid-channel-prepend",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-valid-channel-prepend",
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
            2
          ],
          "destination": [
            "obj-derived-monitor",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-js",
            3
          ],
          "destination": [
            "obj-midi-valid-monitor",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-js",
            4
          ],
          "destination": [
            "obj-active-valid-monitor",
            0
          ]
        }
      },
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
      },
      {
        "patchline": {
          "source": [
            "monitor-play-tab",
            0
          ],
          "destination": [
            "monitor-play-bang",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "monitor-play-bang",
            0
          ],
          "destination": [
            "monitor-play-message",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "monitor-play-message",
            0
          ],
          "destination": [
            "monitor-detail",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "monitor-monitor-tab",
            0
          ],
          "destination": [
            "monitor-monitor-bang",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "monitor-monitor-bang",
            0
          ],
          "destination": [
            "monitor-monitor-message",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "monitor-monitor-message",
            0
          ],
          "destination": [
            "monitor-detail",
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
      },
      {
        "name": "harmonic_monitor.js",
        "bootpath": ".",
        "type": "TEXT",
        "implicit": 1
      }
    ],
    "autosave": 0,
    "bgcolor": [
      0.12,
      0.14,
      0.16,
      1.0
    ]
  }
}
